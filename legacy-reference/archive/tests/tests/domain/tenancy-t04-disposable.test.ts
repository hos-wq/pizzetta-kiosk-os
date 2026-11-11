import { describe, expect, it } from 'vitest';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { createContractVersion, recordCheckIn } from '../../apps/worker/src/tenancies';
import { terminateTenancy } from '../../apps/worker/src/tenancies';
import { recordCheckout } from '../../apps/worker/src/turnover';
import { D1Repository } from '../../apps/worker/src/repository';

const disposable = () => {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync('db/migrations-rc').filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(`db/migrations-rc/${file}`, 'utf8'));
  sqlite.exec('PRAGMA foreign_keys=ON');
  const prepare = (sql: string) => ({ bind: (...args: unknown[]) => ({
    all: async () => ({ results: sqlite.prepare(sql).all(...args as SQLInputValue[]) }),
    first: async () => sqlite.prepare(sql).get(...args as SQLInputValue[]) ?? null,
    run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...args as SQLInputValue[]).changes) } }),
  }) });
  const db = { prepare, batch: async (statements: Array<{ run: () => Promise<unknown> }>) => { sqlite.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; } catch (error) { sqlite.exec('ROLLBACK'); throw error; } } } as unknown as D1Database;
  const repo = new D1Repository(db);
  sqlite.exec("INSERT INTO units (id,actual_unit_number,floor,type,sqm,monthly_rent_centavos,commercial_priority,status,created_at,updated_at) VALUES ('BR·90','U-9090',9,'STUDIO',24,2500000,'HIGH','AVAILABLE','2026-10-15','2026-10-15'),('BR·91','U-9091',9,'STUDIO',24,2500000,'HIGH','AVAILABLE','2026-10-15','2026-10-15'); INSERT INTO persons (id,display_name,created_at,updated_at) VALUES ('person-test','Disposable Tenant','2026-10-15','2026-10-15'); INSERT INTO tenancies (id,unit_id,person_id,tenant_name,start_at,end_at,monthly_rent_centavos,security_deposit_centavos,advance_amount_centavos,payment_due_day,pdc_required,status,created_at,updated_at) VALUES ('tenancy-test','BR·90','person-test','Disposable Tenant','2026-10-15T00:00:00+08:00','2026-12-15T00:00:00+08:00',1800000,1000000,0,15,0,'ACTIVE','2026-10-15','2026-10-15'),('tenancy-check','BR·91','person-test','Disposable Tenant','2026-10-15T00:00:00+08:00','2026-12-15T00:00:00+08:00',1800000,1000000,0,15,0,'UPCOMING','2026-10-15','2026-10-15'); INSERT INTO tenancy_contract_versions (id,tenancy_id,version_number,start_date,end_exclusive,last_occupied_date,monthly_rent_centavos,currency_code,monthly_due_day,expected_payment_day,deposit_centavos,source,created_at,updated_at) VALUES ('version-test','tenancy-test',1,'2026-10-15','2026-11-15','2026-11-14',1800000,'PHP',15,14,1000000,'DISPOSABLE','2026-10-15','2026-10-15');");
  return { sqlite, repo };
};

describe('T04 T03 mutation gate on disposable migrated D1', () => {
  it('accepts adjacent renewal and rejects overlap', async () => {
    const { sqlite, repo } = disposable();
    await createContractVersion(repo, 'tenancy-test', { start_date: '2026-11-15', end_exclusive: '2026-12-15', last_occupied_date: '2026-12-14', monthly_rent_centavos: 1900000, deposit_centavos: 1000000, monthly_due_day: 15, expected_payment_day: 14, source: 'DISPOSABLE' }, 'tester');
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM tenancy_contract_versions WHERE tenancy_id=?').get('tenancy-test')?.count).toBe(2);
    await expect(createContractVersion(repo, 'tenancy-test', { start_date: '2026-11-20', end_exclusive: '2027-01-01', last_occupied_date: '2026-12-31', monthly_rent_centavos: 1900000, source: 'DISPOSABLE' }, 'tester')).rejects.toMatchObject({ code: 'OVERLAPPING_CONTRACT_VERSION' });
    sqlite.close();
  });

  it('terminates without checkout and rejects invalid termination', async () => {
    const { sqlite, repo } = disposable();
    await terminateTenancy(repo, 'tenancy-test', { effective_date: '2026-11-01', reason: 'Disposable test', confirmed: true }, 'tester');
    expect(sqlite.prepare('SELECT status FROM tenancies WHERE id=?').get('tenancy-test')?.status).toBe('TERMINATED');
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM tenancy_checkouts WHERE tenancy_id=?').get('tenancy-test')?.count).toBe(0);
    await expect(terminateTenancy(repo, 'tenancy-test', { effective_date: '2026-11-02', reason: 'Again', confirmed: true }, 'tester')).rejects.toMatchObject({ code: 'INVALID_TERMINATION_STATE' });
    sqlite.close();
  });

  it('enforces physical check-in/check-out transitions', async () => {
    const { sqlite, repo } = disposable();
    await expect(recordCheckout(repo, 'tenancy-check', { confirmed: true, actual_check_out_at: '2026-10-16T10:00:00+08:00' }, 'tester')).rejects.toMatchObject({ code: 'INVALID_CHECK_OUT_STATE' });
    await recordCheckIn(repo, 'tenancy-check', { confirmed: true, actual_check_in_at: '2026-10-16T09:00:00+08:00' }, 'tester');
    await expect(recordCheckIn(repo, 'tenancy-check', { confirmed: true, actual_check_in_at: '2026-10-16T09:00:00+08:00' }, 'tester')).rejects.toMatchObject({ code: 'INVALID_CHECK_IN_STATE' });
    await recordCheckout(repo, 'tenancy-check', { confirmed: true, actual_check_out_at: '2026-10-16T10:00:00+08:00' }, 'tester');
    await expect(recordCheckout(repo, 'tenancy-check', { confirmed: true, actual_check_out_at: '2026-10-16T11:00:00+08:00' }, 'tester')).rejects.toMatchObject({ code: 'INVALID_CHECK_OUT_STATE' });
    sqlite.close();
  });
});
