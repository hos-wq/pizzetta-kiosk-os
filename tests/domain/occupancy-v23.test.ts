import { describe, expect, it } from 'vitest';
import { getOccupancyProjection, getRoomOccupancy, getTenancyOperationalState } from '../../apps/worker/src/occupancy';
import { recordCheckIn, recordUtilityReading, selectWifi } from '../../apps/worker/src/tenancies';

const tenancy = { id: 'tenancy-1', unit_id: 'BR·07', person_id: 'person-1', tenant_name: 'Mario Rossi', start_at: '2026-11-01T00:00:00+08:00', end_at: '2027-05-01T00:00:00+08:00', status: 'UPCOMING', updated_at: '2026-10-05T00:00:00.000Z' };

const operationRepo = (checkIn: Record<string, unknown> | null = null) => {
  const runs: { sql: string; args: unknown[] }[] = [];
  const audits: unknown[][] = [];
  const repo = {
    runs,
    audits,
    first: async (sql: string, ...args: unknown[]) => {
      if (sql.includes('LEFT JOIN tenancy_check_ins')) return checkIn ? { ...tenancy, check_in_id: checkIn.id, actual_check_in_at: checkIn.actual_check_in_at } : { ...tenancy };
      if (sql.includes('FROM tenancies WHERE id=?')) return tenancy;
      if (sql.includes('FROM units')) return { id: 'BR·07', monthly_rent_centavos: 2500000 };
      if (sql.includes('FROM persons')) return { id: 'person-1', display_name: 'Mario Rossi' };
      return null;
    },
    all: async () => [],
    run: async (sql: string, ...args: unknown[]) => { runs.push({ sql, args }); },
    audit: async (...args: unknown[]) => { audits.push(args); },
  };
  return repo;
};

describe('V2.3 occupancy and check-in operations', () => {
  it('projects declared, contractual and physical states without inventing check-in', async () => {
    const repo = {
      first: async (sql: string) => {
        if (sql.includes('room_master_data')) return { id: 'BR·03', status: 'AVAILABLE', declared_occupancy: 'OCCUPIED', occupancy_as_of: '2026-10-15' };
        if (sql.includes("status IN ('UPCOMING','ACTIVE')") && sql.includes('COUNT')) return { count: 1 };
        if (sql.includes("status IN ('UPCOMING','ACTIVE')")) return { id: 'tenancy-bianca-br03', status: 'ACTIVE' };
        return null;
      },
    };
    await expect(getOccupancyProjection(repo as never, 'BR·03')).resolves.toMatchObject({
      declared_occupancy: 'OCCUPIED',
      contractual_status: 'ACTIVE',
      physical_occupancy_evidence: 'NOT_RECORDED',
      allocation_availability: 'BLOCKED',
      reconciliation_status: 'REVIEW_REQUIRED',
      reconciliation_issues: expect.arrayContaining(['DECLARED_OCCUPIED_WITHOUT_CHECK_IN', 'ACTIVE_WITHOUT_CHECK_IN']),
    });
  });

  it('distinguishes a recorded checkout from missing physical evidence', async () => {
    const repo = { first: async (sql: string) => {
      if (sql.includes('room_master_data')) return { id: 'BR·07', status: 'AVAILABLE', declared_occupancy: 'VACANT', occupancy_as_of: '2026-10-15' };
      if (sql.includes("status IN ('UPCOMING','ACTIVE')") && sql.includes('COUNT')) return { count: 0 };
      if (sql.includes('ORDER BY COALESCE')) return { id: 'tenancy-07', status: 'ENDED' };
      if (sql.includes('tenancy_checkouts')) return { id: 'checkout-07', actual_check_out_at: '2026-10-10T10:00:00+08:00' };
      return null;
    } };
    await expect(getOccupancyProjection(repo as never, 'BR·07')).resolves.toMatchObject({ physical_occupancy_evidence: 'CHECKED_OUT', contractual_status: 'ENDED', allocation_availability: 'AVAILABLE' });
  });

  it('derives vacant, reserved and occupied without using tenancy dates as check-in', async () => {
    const vacant = await getRoomOccupancy({ first: async () => null } as never, 'BR·07');
    expect(vacant.state).toBe('VACANT');
    const reserved = await getRoomOccupancy({ first: async () => tenancy } as never, 'BR·07');
    expect(reserved.state).toBe('RESERVED');
    const occupied = await getRoomOccupancy({ first: async () => ({ ...tenancy, check_in_id: 'check-in-1' }) } as never, 'BR·07');
    expect(occupied.state).toBe('OCCUPIED');
  });

  it('derives an incomplete handover checklist without corrupting tenancy truth', async () => {
    const state = await getTenancyOperationalState({ first: async () => null, all: async () => [] } as never, 'tenancy-1');
    expect(state.complete).toBe(false);
    expect(state.incomplete_items).toEqual(['check_in', 'contract_reference', 'tenant_id_reference', 'electricity_opening_reading', 'water_opening_reading', 'wifi_selection']);
  });

  it('records check-in with operator audit and preserves dated utility history', async () => {
    const repo = operationRepo();
    await recordCheckIn(repo as never, 'tenancy-1', { actual_check_in_at: '2026-11-01T09:00:00+08:00', confirmed: true }, 'owner-user');
    await recordUtilityReading(repo as never, 'tenancy-1', { utility_type: 'ELECTRICITY', reading_kind: 'OPENING', reading_value: '120.40', recorded_at: '2026-11-01T09:05:00+08:00' });
    expect(repo.runs.some(item => item.sql.startsWith('INSERT INTO tenancy_check_ins'))).toBe(true);
    expect(repo.runs.some(item => item.sql.startsWith('INSERT INTO utility_readings'))).toBe(true);
    expect(repo.audits.some(item => item[0] === 'CHECK_IN' && item[3] && (item[3] as Record<string, unknown>).performed_by === 'owner-user')).toBe(true);
  });

  it('keeps Wi-Fi selection tenancy-specific and auditable', async () => {
    const repo = operationRepo();
    await selectWifi(repo as never, 'tenancy-1', { plan_name: '50 Mbps', speed_mbps: 50, monthly_amount_centavos: 84000, selected_at: '2026-11-01T09:10:00+08:00' });
    const insert = repo.runs.find(item => item.sql.startsWith('INSERT INTO tenancy_wifi_selections'));
    expect(insert?.args).toContain('tenancy-1');
    expect(repo.audits.some(item => item[0] === 'WIFI_SELECTION')).toBe(true);
  });
});
