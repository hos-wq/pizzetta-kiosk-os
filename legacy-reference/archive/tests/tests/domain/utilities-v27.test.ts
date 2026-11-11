import { describe, expect, it } from 'vitest';
import { calculateUtilityCharge, listUtilityReadings, recordRoomUtilityReading, utilitySummary } from '../../apps/worker/src/tenancies';
import { readFileSync } from 'node:fs';

function repoFactory() {
  const readings: Record<string, unknown>[] = []; const audits: unknown[][] = [];
  return {
    readings, audits,
    async first(sql: string, ...args: unknown[]) {
      if (sql.includes('FROM units')) return { id: args[0] };
      if (sql.includes('FROM tenancies')) return args[0] === 'tenancy-07' ? { id: 'tenancy-07', unit_id: 'BR·07' } : args[0] === 'tenancy-09' ? { id: 'tenancy-09', unit_id: 'BR·09' } : null;
      if (sql.includes('FROM utility_readings')) return readings.find(row => row.id === args[0]) ?? null;
      if (sql.includes('FROM utility_rates')) return { id: 'rate-water', rate_centavos: 4000, utility_type: 'WATER' };
      return null;
    },
    async all(sql: string, ...args: unknown[]) { return readings.filter(row => row.unit_id === args[0] && (!args[1] || row.utility_type === args[1]) && (!args[2] || row.tenancy_id === args[2])); },
    async run(sql: string, ...args: unknown[]) { if (sql.includes('INSERT INTO utility_readings')) readings.push({ id: args[0], tenancy_id: args[1], unit_id: args[2], utility_type: args[3], reading_kind: args[4], reading_value: args[5], recorded_at: args[6] }); },
    async audit(...args: unknown[]) { audits.push(args); },
  };
}

describe('V2.7 canonical utility readings', () => {
  it('migration preserves canonical table and historical rows while making tenancy optional', () => {
    const sql = readFileSync('db/migrations/0009_nullable_utility_reading_tenancy.sql', 'utf8');
    expect(sql).toContain('INSERT INTO utility_readings_new'); expect(sql).toContain('SELECT id,tenancy_id,unit_id'); expect(sql).toContain('tenancy_id TEXT REFERENCES tenancies');
  });

  it('accepts Room-only and tenancy-linked readings, but rejects mismatched attribution', async () => {
    const repo = repoFactory();
    await recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', utility_type: 'WATER', reading_kind: 'INTERMEDIATE', reading_value: '184.2', recorded_at: '2026-10-05T00:00:00Z' }, 'owner');
    await recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', tenancy_id: 'tenancy-07', utility_type: 'WATER', reading_kind: 'OPENING', reading_value: '180', recorded_at: '2026-10-01T00:00:00Z' }, 'owner');
    await expect(recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', tenancy_id: 'tenancy-09', utility_type: 'WATER', reading_value: '190', recorded_at: '2026-10-06T00:00:00Z' }, 'owner')).rejects.toMatchObject({ code: 'TENANCY_ROOM_MISMATCH' });
    expect(repo.readings).toHaveLength(2);
  });

  it('calculates chronology across readings with and without tenancy context', async () => {
    const repo = repoFactory();
    await recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', utility_type: 'WATER', reading_value: '184.2', recorded_at: '2026-10-01T00:00:00Z' }, 'owner');
    await recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', tenancy_id: 'tenancy-07', utility_type: 'WATER', reading_kind: 'CLOSING', reading_value: '188.7', recorded_at: '2026-10-05T00:00:00Z' }, 'owner');
    const summary = await utilitySummary(repo as never, 'BR·07', 'WATER');
    expect(summary.readings[1].consumption).toBe(4.5);
  });

  it('calculates charges from the effective rate and flags meter resets', async () => {
    const repo = repoFactory();
    await recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', utility_type: 'WATER', reading_value: '184.2', recorded_at: '2026-10-01T00:00:00Z' }, 'owner');
    await recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', utility_type: 'WATER', reading_value: '188.7', recorded_at: '2026-10-05T00:00:00Z' }, 'owner');
    const result = await calculateUtilityCharge(repo as never, 'BR·07', 'WATER');
    expect(result.charges[0]).toMatchObject({ consumption: 4.5, amount_centavos: 18000, status: 'CALCULATED' });
  });
});
