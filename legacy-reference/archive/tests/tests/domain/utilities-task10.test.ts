import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getRoomUtilities, recordRoomUtilityReading, utilitySummary, updateRoomUtilityService } from '../../apps/worker/src/tenancies';

const makeRepo = () => {
  const readings: Record<string, unknown>[] = []; const services: Record<string, unknown>[] = []; let duplicateSignature = '';
  const repo = {
    readings, services,
    async first(sql: string, ...args: unknown[]) {
      if (sql.includes('FROM units')) return ['BR·07', 'BR·09'].includes(String(args[0])) ? { id: args[0] } : null;
      if (sql.includes('FROM tenancies')) return String(args[0]) === 't-07' ? { id: 't-07', unit_id: 'BR·07' } : null;
      if (sql.includes('utility_readings WHERE unit_id=? AND utility_type=? AND recorded_at=?')) return duplicateSignature === `${args[0]}|${args[1]}|${args[2]}|${args[3]}|${args[4]}` ? { id: 'existing' } : null;
      if (sql.includes('FROM utility_services')) return services.find(row => row.unit_id === args[0] && row.utility_type === args[1]) ?? null;
      if (sql.includes('FROM utility_readings')) return readings.find(row => row.id === args[0]) ?? null;
      if (sql.includes('FROM utility_rates')) return null;
      return null;
    },
    async all(sql: string, ...args: unknown[]) {
      if (sql.includes('utility_services')) return services.filter(row => row.unit_id === args[0]);
      if (sql.includes('utility_readings')) return readings.filter(row => row.unit_id === args[0] && (!args[1] || row.utility_type === args[1]));
      return [];
    },
    async run(sql: string, ...args: unknown[]) {
      if (sql.includes('INSERT INTO utility_readings')) { readings.push({ id: args[0], tenancy_id: args[1], unit_id: args[2], utility_type: args[3], reading_kind: args[4], reading_value: args[5], recorded_at: args[6], meter_event: args[11] }); duplicateSignature = `${args[2]}|${args[3]}|${args[6]}|${args[5]}|${args[11]}`; }
      if (sql.includes('INSERT INTO utility_services')) services.push({ id: args[0], unit_id: args[1], utility_type: args[2], meter_identifier: args[3], average_month: args[4], billing: args[5], wifi_ready: args[6], monthly_cost_centavos: args[7], provider: args[8], connection: args[9] });
      return { meta: { changes: 1 } };
    },
    async audit() { return undefined; },
  };
  return repo;
};

describe('Task 10 persistent utilities', () => {
  it('persists water/electricity readings and derives consumption only from chronology', async () => {
    const repo = makeRepo();
    await recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', utility_type: 'WATER', reading_value: '100', recorded_at: '2026-10-01T09:00:00Z' }, 'owner');
    await recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', utility_type: 'WATER', reading_value: '104.5', recorded_at: '2026-10-02T09:00:00Z' }, 'owner');
    const summary = await utilitySummary(repo as never, 'BR·07', 'WATER');
    expect(summary.readings[0].consumption).toBeNull();
    expect(summary.readings[1].consumption).toBe(4.5);
  });

  it('rejects exact duplicate readings and requires an explicit reset/replacement for a lower value', async () => {
    const repo = makeRepo();
    await recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', utility_type: 'ELECTRICITY', reading_value: '500', recorded_at: '2026-10-01T09:00:00Z' }, 'owner');
    await expect(recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', utility_type: 'ELECTRICITY', reading_value: '500', recorded_at: '2026-10-01T09:00:00Z' }, 'owner')).rejects.toMatchObject({ code: 'DUPLICATE_UTILITY_READING' });
    await expect(recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', utility_type: 'ELECTRICITY', reading_value: '10', recorded_at: '2026-10-02T09:00:00Z' }, 'owner')).rejects.toMatchObject({ code: 'NEGATIVE_CONSUMPTION_REQUIRES_RESET' });
    await recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', utility_type: 'ELECTRICITY', reading_value: '10', meter_event: 'REPLACEMENT', recorded_at: '2026-10-02T09:00:00Z' }, 'owner');
    await recordRoomUtilityReading(repo as never, { unit_id: 'BR·07', utility_type: 'ELECTRICITY', reading_value: '12', recorded_at: '2026-10-03T09:00:00Z' }, 'owner');
    const summary = await utilitySummary(repo as never, 'BR·07', 'ELECTRICITY');
    expect(summary.readings.at(-2)?.consumption).toBeNull();
    expect(summary.readings.at(-1)?.consumption).toBe(2);
  });

  it('rejects cross-room tenancy attribution and persists all three service configurations', async () => {
    const repo = makeRepo();
    await expect(recordRoomUtilityReading(repo as never, { unit_id: 'BR·09', tenancy_id: 't-07', utility_type: 'WATER', reading_value: '1', recorded_at: '2026-10-01T09:00:00Z' }, 'owner')).rejects.toMatchObject({ code: 'TENANCY_ROOM_MISMATCH' });
    await updateRoomUtilityService(repo as never, 'BR·07', 'WATER', { meter_identifier: 'W-07', average_month: '12.5', billing: 'OWNER' }, 'owner');
    await updateRoomUtilityService(repo as never, 'BR·07', 'ELECTRICITY', { meter_identifier: 'E-07', average_month: '180', billing: 'MERALCO' }, 'owner');
    await updateRoomUtilityService(repo as never, 'BR·07', 'INTERNET', { wifi_ready: 'TRUE', monthly_cost_centavos: 84000, provider: 'Test ISP', connection: 'FIBER' }, 'owner');
    expect(repo.services).toHaveLength(3);
    expect(repo.services.find(row => row.utility_type === 'INTERNET')?.monthly_cost_centavos).toBe(84000);
  });

  it('defines the isolated service and meter-event schema in the RC migration chain', () => {
    const migration = readFileSync('db/migrations-rc/0033_utility_services_and_meter_events.sql', 'utf8');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS utility_services');
    expect(migration).toContain("meter_event TEXT NOT NULL DEFAULT 'READING'");
    expect(migration).toContain('idx_utility_reading_exact');
  });
});
