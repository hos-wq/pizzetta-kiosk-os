import { describe, expect, it } from 'vitest';
import { getReadiness, recordCheckout, updateTurnoverTask } from '../../apps/worker/src/turnover';

function repoFactory() {
  const tasks: Record<string, unknown>[] = []; const audits: unknown[][] = []; const tenancy = { id: 'tenancy-1', unit_id: 'BR·07', status: 'ACTIVE' };
  return { tasks, audits,
    async first(sql: string, ...args: unknown[]) { if (sql.includes('FROM tenancies')) return args[0] === 'tenancy-1' ? tenancy : null; if (sql.includes('FROM units')) return { id: args[0] }; if (sql.includes('FROM tenancy_check_ins')) return { id: 'check-in-1', actual_check_in_at: '2026-10-04T00:00:00Z' }; if (sql.includes('FROM tenancy_checkouts')) return null; if (sql.includes('FROM turnover_tasks')) return tasks.find(item => item.id === args[0]) ?? null; return null; },
    async all(_sql: string, ...args: unknown[]) { return tasks.filter(task => task.unit_id === args[0]); },
    async run(sql: string, ...args: unknown[]) { if (sql.includes('INSERT INTO turnover_tasks')) tasks.push({ id: args[0], unit_id: args[1], tenancy_id: args[2], task_key: args[3], label: args[4], is_blocker: args[5], status: args[6] }); if (sql.includes('UPDATE turnover_tasks')) { const task = tasks.find(item => item.id === args[4]); if (task) task.status = args[0]; } },
    async audit(...args: unknown[]) { audits.push(args); },
  };
}

describe('V2.8 turnover/readiness', () => {
  it('checkout is explicit and creates derived readiness blockers', async () => { const repo = repoFactory(); const result = await recordCheckout(repo as never, 'tenancy-1', { actual_check_out_at: '2026-10-05T00:00:00Z', confirmed: true }, 'owner'); expect(result.state).toBe('NOT_READY'); expect(repo.tasks).toHaveLength(10); expect(repo.audits[0][0]).toBe('CHECK_OUT'); });
  it('completion derives READY without deleting task history', async () => { const repo = repoFactory(); await recordCheckout(repo as never, 'tenancy-1', { actual_check_out_at: '2026-10-05T00:00:00Z', confirmed: true }, 'owner'); for (const task of repo.tasks.filter(task => Number(task.is_blocker) === 1)) await updateTurnoverTask(repo as never, String(task.id), { status: 'DONE' }, 'owner'); const readiness = await getReadiness(repo as never, 'BR·07'); expect(readiness.state).toBe('READY'); expect(repo.tasks).toHaveLength(10); expect(readiness.warnings).toHaveLength(2); });
});
