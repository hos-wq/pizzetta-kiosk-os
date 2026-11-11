import { describe, expect, it } from 'vitest';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { listUnits, updateUnit } from '../../apps/worker/src/domain';
import { createCustomListingField, getListing, updateListing } from '../../apps/worker/src/listing';
import { D1Repository } from '../../apps/worker/src/repository';
import { unitPatchSchema, unitListQuerySchema } from '../../packages/contracts/src';

const canonicalRooms = [
  ['BR·02', 'U-1002'], ['BR·03', 'U-1003'], ['BR·04', 'U-1004'], ['BR·05', 'U-1005'],
  ['BR·07', 'U-1007'], ['BR·08', 'U-1008'], ['BR·09', 'U-1009'], ['BR·10', 'U-1010'],
  ['BR·27', 'U-2704B'], ['BR·32', 'U-3208'],
] as const;

const migratedD1 = () => {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync('db/migrations-rc').filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(`db/migrations-rc/${file}`, 'utf8'));
  sqlite.exec('PRAGMA foreign_keys=ON');
  const prepare = (sql: string) => ({
    bind: (...args: unknown[]) => ({
      all: async () => ({ results: sqlite.prepare(sql).all(...args as SQLInputValue[]) }),
      first: async () => sqlite.prepare(sql).get(...args as SQLInputValue[]) ?? null,
      run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...args as SQLInputValue[]).changes) } }),
    }),
  });
  return { sqlite, db: { prepare, batch: async (statements: Array<{ run: () => Promise<unknown> }>) => { sqlite.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; } catch (error) { sqlite.exec('ROLLBACK'); throw error; } } } as unknown as D1Database };
};

describe('BR Office room contracts', () => {
  it('accepts bounded master-field and structured feature edits', () => {
    expect(unitPatchSchema.safeParse({ floor: 27, sqm: 31, status: 'AVAILABLE', features: { balcony: true, tv_inches: '43' } }).success).toBe(true);
    expect(unitPatchSchema.safeParse({ floor: 0 }).success).toBe(false);
    expect(unitPatchSchema.safeParse({ monthly_rent_centavos: -1 }).success).toBe(false);
    expect(unitPatchSchema.safeParse({ id: 'BR·02' }).success).toBe(false);
  });

  it('validates bounded list filters and sort fields', () => {
    expect(unitListQuerySchema.parse({ search: 'BR·07', status: 'AVAILABLE', sort: 'floor', direction: 'desc' })).toMatchObject({ search: 'BR·07', status: 'AVAILABLE', sort: 'floor', direction: 'desc' });
    expect(unitListQuerySchema.safeParse({ sort: 'DROP TABLE units' }).success).toBe(false);
  });

  it('lists room records through the repository without a parallel model', async () => {
    const fake = {
      all: async (sql: string) => sql.startsWith('SELECT * FROM units') ? [{ id: 'BR·02', actual_unit_number: 'U-1002', floor: 10, type: 'Standard Studio', sqm: 24, monthly_rent_centavos: 2500000, status: 'AVAILABLE' }] : sql.includes('unit_features') ? [{ feature_key: 'balcony', feature_value: 'true' }] : [],
      first: async (sql: string) => sql.includes('tenancies') || sql.includes('availability_blocks') ? null : null,
    };
    const rooms = await listUnits(fake as never, { limit: 50, sort: 'id', direction: 'asc' });
    expect(rooms[0]).toMatchObject({ id: 'BR·02', features: [{ feature_key: 'balcony', feature_value: 'true' }], current_tenancy: null, maintenance: null });
  });

  it('supports an authorized room edit with a stale-update guard', async () => {
    const current = { id: 'BR·07', actual_unit_number: 'U-1007', floor: 10, type: 'Studio', sqm: 24, status: 'AVAILABLE', updated_at: '2026-10-12T00:00:00.000Z' };
    const statements: string[] = [];
    const fake = {
      all: async () => [],
      first: async (sql: string) => sql.includes('FROM units') ? current : null,
      run: async (sql: string) => { statements.push(sql); return { meta: { changes: 1 } }; },
      audit: async () => undefined,
    };
    await updateUnit(fake as never, 'BR·07', { floor: 11, expected_updated_at: current.updated_at });
    expect(statements.some(sql => sql.includes('AND updated_at=?'))).toBe(true);
    await expect(updateUnit(fake as never, 'BR·07', { floor: 12, expected_updated_at: '2026-10-11T00:00:00.000Z' })).rejects.toThrow('changed since it was loaded');
  });

  it('persists BR·07 through the migrated local D1 contract without changing the other canonical rooms', async () => {
    const { sqlite, db } = migratedD1();
    try {
      const repo = new D1Repository(db);
      const timestamp = '2026-10-12T00:00:00.000Z';
      for (const [id, actualUnitNumber] of canonicalRooms) {
        sqlite.prepare('INSERT INTO units (id,actual_unit_number,floor,type,sqm,monthly_rent_centavos,commercial_priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id, actualUnitNumber, 10, 'STUDIO', 24, 2500000, 'HIGH', 'AVAILABLE', timestamp, timestamp);
      }
      const before = await listUnits(repo, { limit: 100, sort: 'id', direction: 'asc' }) as Array<Record<string, unknown>>;
      const room = before.find(item => item.id === 'BR·07');
      expect(room?.actual_unit_number).toBe('U-1007');
      await updateUnit(repo, 'BR·07', { type: 'DELUXE', floor: 11, expected_updated_at: room?.updated_at });
      const after = await listUnits(repo, { limit: 100, sort: 'id', direction: 'asc' }) as Array<Record<string, unknown>>;
      expect(after).toHaveLength(10);
      expect(after.find(item => item.id === 'BR·07')).toMatchObject({ type: 'DELUXE', floor: 11, actual_unit_number: 'U-1007' });
      const stable = (items: typeof before) => items.filter(item => item.id !== 'BR·07').map(item => ({ id: item.id, actual_unit_number: item.actual_unit_number, type: item.type, floor: item.floor, sqm: item.sqm, status: item.status }));
      expect(stable(after)).toEqual(stable(before));
    } finally {
      sqlite.close();
    }
  });

  it('persists typed Listing categories and scoped custom fields with stale and invalid-write protection', async () => {
    const { sqlite, db } = migratedD1();
    try {
      const repo = new D1Repository(db);
      const timestamp = '2026-10-12T00:00:00.000Z';
      for (const [id, actualUnitNumber] of canonicalRooms) sqlite.prepare('INSERT INTO units (id,actual_unit_number,floor,type,sqm,monthly_rent_centavos,commercial_priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id, actualUnitNumber, 10, 'STUDIO', 24, 2500000, 'HIGH', 'AVAILABLE', timestamp, timestamp);
      const initial = await getListing(repo, 'BR·07');
      await updateListing(repo, 'BR·07', { expected_updated_at: initial.unit.updated_at as string, unit_fields: { type: 'DELUXE', floor: 11 }, fields: { city: 'Makati', balcony: 'TRUE', elevators: 2, pets: 'BY APPROVAL', minimum_stay: 3 } }, 'test-owner');
      const saved = await getListing(repo, 'BR·07');
      expect(saved.unit).toMatchObject({ type: 'DELUXE', floor: 11 });
      expect(saved.fields.find(field => field.key === 'city')?.value).toBe('Makati');
      expect(saved.fields.find(field => field.key === 'elevators')?.value).toBe(2);
      expect(saved.fields.find(field => field.key === 'minimum_stay')?.value).toBe(3);
      await expect(updateListing(repo, 'BR·07', { expected_updated_at: saved.unit.updated_at as string, fields: { balcony: 'INVALID' } }, 'test-owner')).rejects.toThrow('invalid value');
      await expect(updateListing(repo, 'BR·07', { expected_updated_at: initial.unit.updated_at as string, fields: { city: 'Stale' } }, 'test-owner')).rejects.toThrow('changed since it was loaded');
      await expect(updateListing(repo, 'BR·03', { fields: { city: 'Other' } }, 'test-owner')).resolves.toBeTruthy();
      const custom = await createCustomListingField(repo, 'BR·07', { category: 'CUSTOM', label: 'Owner note', value: 'Keep quiet' }, 'test-owner');
      expect(custom.fields.find(field => field.label === 'Owner note')?.system_defined).toBe(false);
      expect((await getListing(repo, 'BR·03')).fields.find(field => field.key === 'city')?.value).toBe('Other');
      expect((await getListing(repo, 'BR·07')).fields.find(field => field.key === 'city')?.value).toBe('Makati');
    } finally {
      sqlite.close();
    }
  });
});
