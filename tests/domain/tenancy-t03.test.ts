import { describe, expect, it } from 'vitest';
import { createContractVersion, terminateTenancy } from '../../apps/worker/src/tenancies';

const tenancy = { id: 't1', unit_id: 'BR·27', person_id: 'p1', status: 'ACTIVE', start_at: '2026-09-16T00:00:00+08:00', end_at: '2026-12-15T00:00:00+08:00', monthly_rent_centavos: 1800000, security_deposit_centavos: 1000000, payment_due_day: 15 };
const repoFactory = (versions: Record<string, unknown>[] = []) => {
  const writes: string[] = [];
  return {
    writes,
    async first(sql: string) {
      if (sql.includes('FROM tenancies')) return tenancy;
      if (sql.includes('tenancy_terminations')) return null;
      if (sql.includes('FROM units')) return { id: tenancy.unit_id };
      return null;
    },
    async all(sql: string) { return sql.includes('tenancy_contract_versions') ? versions : []; },
    async run(sql: string) { writes.push(sql); return { meta: { changes: 1 } }; },
    async batch(statements: { sql: string }[]) { writes.push(...statements.map(statement => statement.sql)); },
    async audit() { writes.push('AUDIT'); },
  };
};

describe('T03 contract lifecycle', () => {
  it('creates an adjacent renewal without replacing history', async () => {
    const repo = repoFactory([{ id: 'v1', version_number: 1, start_date: '2026-09-16', end_exclusive: '2026-10-15' }]);
    await createContractVersion(repo as never, 't1', { start_date: '2026-10-15', end_exclusive: '2026-12-15', last_occupied_date: '2026-12-14', monthly_rent_centavos: 1800000, deposit_centavos: 1000000, monthly_due_day: 15, expected_payment_day: 14, source: 'TEST' }, 'tester');
    expect(repo.writes.some(sql => sql.startsWith('INSERT INTO tenancy_contract_versions'))).toBe(true);
    expect(repo.writes.some(sql => sql.startsWith('UPDATE tenancies'))).toBe(true);
  });

  it('rejects an overlapping contract version', async () => {
    const repo = repoFactory([{ id: 'v2', version_number: 2, start_date: '2026-10-15', end_exclusive: '2026-12-15' }]);
    await expect(createContractVersion(repo as never, 't1', { start_date: '2026-11-01', end_exclusive: '2027-01-01', last_occupied_date: '2026-12-31', monthly_rent_centavos: 1800000, source: 'TEST' }, 'tester')).rejects.toMatchObject({ code: 'OVERLAPPING_CONTRACT_VERSION' });
  });

  it('terminates audibly without creating checkout evidence', async () => {
    const repo = repoFactory();
    const result = await terminateTenancy(repo as never, 't1', { effective_date: '2026-11-01', reason: 'Owner decision', confirmed: true }, 'tester');
    expect(repo.writes.some(sql => sql.startsWith('INSERT INTO tenancy_terminations'))).toBe(true);
    expect(repo.writes.some(sql => sql.includes("UPDATE tenancies SET status='TERMINATED'"))).toBe(true);
    expect(repo.writes.some(sql => sql.includes('tenancy_checkouts'))).toBe(false);
    expect(result).toBeTruthy();
  });
});
