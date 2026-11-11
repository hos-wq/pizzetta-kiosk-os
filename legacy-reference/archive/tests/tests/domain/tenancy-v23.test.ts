import { describe, expect, it } from 'vitest';
import { availability } from '../../apps/worker/src/domain';
import { createTenancy, updateTenancy } from '../../apps/worker/src/tenancies';
import { tenancyCreateSchema, tenancyPatchSchema } from '../../packages/contracts/src';

const baseTenancy = (overrides: Record<string, unknown> = {}) => ({
  id: 'tenancy-1', unit_id: 'BR·07', person_id: 'person-1', tenant_name: 'Mario Rossi', start_at: '2026-11-01T00:00:00+08:00', end_at: '2027-05-01T00:00:00+08:00', monthly_rent_centavos: 2400000, security_deposit_centavos: 2400000, advance_amount_centavos: 2400000, payment_due_day: 1, pdc_required: 0, status: 'UPCOMING', updated_at: '2026-10-05T00:00:00.000Z', ...overrides,
});

const fakeRepo = (blocks: Record<string, unknown>[] = []) => {
  const runs: { sql: string; args: unknown[] }[] = [];
  const audits: unknown[] = [];
  const repo = {
    runs,
    audits,
    first: async (sql: string, ...args: unknown[]) => {
      if (sql.includes('FROM units')) return { id: String(args[0]), monthly_rent_centavos: 2500000, status: 'AVAILABLE' };
      if (sql.includes('FROM persons')) return { id: String(args[0]), display_name: 'Mario Rossi' };
      if (sql.includes('FROM tenancies WHERE id=?')) return baseTenancy({ id: String(args[0]) });
      if (sql.includes('FROM payments')) return null;
      if (sql.includes('FROM audit_log')) return null;
      return null;
    },
    all: async (sql: string) => {
      if (sql.includes('FROM tenancies') && sql.includes('start_at')) return blocks;
      return [];
    },
    run: async (sql: string, ...args: unknown[]) => { runs.push({ sql, args }); },
    audit: async (...args: unknown[]) => { audits.push(args); },
  };
  return repo;
};

describe('V2.3 tenancy domain', () => {
  it('accepts canonical Person tenancy input and rejects reversed dates', () => {
    const valid = tenancyCreateSchema.safeParse({ person_id: 'person-1', unit_id: 'BR·07', start_at: '2026-11-01T00:00:00+08:00', end_at: '2027-05-01T00:00:00+08:00', monthly_rent_centavos: 2400000, payment_due_day: 1 });
    expect(valid.success).toBe(true);
    expect(tenancyCreateSchema.safeParse({ person_id: 'person-1', unit_id: 'BR·07', start_at: '2027-05-01T00:00:00+08:00', end_at: '2026-11-01T00:00:00+08:00', monthly_rent_centavos: 1, payment_due_day: 1 }).success).toBe(false);
    expect(tenancyPatchSchema.safeParse({ monthly_rent_centavos: -1 }).success).toBe(false);
  });

  it('creates a tenancy linked to Person and Room with independent contracted rent', async () => {
    const repo = fakeRepo();
    await createTenancy(repo as never, { person_id: 'person-1', unit_id: 'BR·07', start_at: '2026-11-01T00:00:00+08:00', end_at: '2027-05-01T00:00:00+08:00', monthly_rent_centavos: 2400000, security_deposit_centavos: 2400000, advance_amount_centavos: 2400000, payment_due_day: 1, pdc_required: false });
    const insert = repo.runs.find(item => item.sql.startsWith('INSERT INTO tenancies'));
    expect(insert?.args).toContain('person-1');
    expect(insert?.args).toContain(2400000);
    expect(repo.audits).toHaveLength(1);
  });

  it('allows adjacent tenancy intervals', async () => {
    const repo = fakeRepo([{ unit_id: 'BR·07', start_at: '2026-10-01T00:00:00Z', end_at: '2026-11-01T00:00:00Z', status: 'ACTIVE' }]);
    await expect(createTenancy(repo as never, { person_id: 'person-1', unit_id: 'BR·07', start_at: '2026-11-01T00:00:00Z', end_at: '2027-01-01T00:00:00Z', monthly_rent_centavos: 2500000, payment_due_day: 1 })).resolves.toBeDefined();
  });

  it('rejects overlapping active or upcoming tenancy intervals', async () => {
    const repo = fakeRepo([{ unit_id: 'BR·07', start_at: '2026-10-15T00:00:00Z', end_at: '2026-12-01T00:00:00Z', status: 'UPCOMING' }]);
    await expect(createTenancy(repo as never, { person_id: 'person-1', unit_id: 'BR·07', start_at: '2026-11-01T00:00:00Z', end_at: '2027-01-01T00:00:00Z', monthly_rent_centavos: 2500000, payment_due_day: 1 })).rejects.toMatchObject({ code: 'UNIT_UNAVAILABLE' });
  });

  it('revalidates availability on update while excluding the tenancy itself', async () => {
    const repo = fakeRepo();
    await updateTenancy(repo as never, 'tenancy-1', { start_at: '2026-12-01T00:00:00Z', end_at: '2027-02-01T00:00:00Z', monthly_rent_centavos: 2300000 });
    expect(repo.runs.some(item => item.sql.startsWith('UPDATE tenancies SET'))).toBe(true);
    expect(repo.audits).toHaveLength(1);
  });

  it('does not treat completed or cancelled-equivalent terminated records as blockers', async () => {
    const repo = fakeRepo([{ unit_id: 'BR·07', start_at: '2026-01-01T00:00:00Z', end_at: '2026-10-01T00:00:00Z', status: 'ENDED' }, { unit_id: 'BR·07', start_at: '2026-10-01T00:00:00Z', end_at: '2026-11-01T00:00:00Z', status: 'TERMINATED' }]);
    await expect(createTenancy(repo as never, { person_id: 'person-1', unit_id: 'BR·07', start_at: '2026-11-01T00:00:00Z', end_at: '2027-01-01T00:00:00Z', monthly_rent_centavos: 2500000, payment_due_day: 1 })).resolves.toBeDefined();
  });

  it('blocks an owner-declared occupied room without fabricating a tenancy or check-in', async () => {
    const repo = {
      first: async (sql: string) => sql.includes('room_master_data') ? { status: 'AVAILABLE', declared_occupancy: 'OCCUPIED', occupancy_as_of: '2026-10-15' } : null,
      all: async () => [],
    };
    await expect(availability(repo as never, 'BR·03', '2026-10-15T00:00:00+08:00', '2026-10-16T00:00:00+08:00')).resolves.toBe(false);
  });
});
