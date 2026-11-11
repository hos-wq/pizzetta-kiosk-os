import { describe, expect, it } from 'vitest'
import { createServiceTask, updateServiceTask } from '../../apps/worker/src/services'

function repoFactory() {
  const rows = new Map<string, Record<string, unknown>>(); const runs: string[] = []
  const repo = {
    runs,
    async first(sql: string, ...args: unknown[]) {
      if (sql.includes('SELECT id FROM units')) return args[0] === 'BR·07' ? { id: 'BR·07' } : null
      if (sql.includes('WHERE m.id=?')) return rows.get(String(args[0])) ?? null
      return null
    },
    async run(sql: string, ...args: unknown[]) { runs.push(sql); if (sql.includes('INSERT INTO maintenance_issues')) { rows.set(String(args[0]), { id: args[0], unit_id: args[1], service_type: args[13], object_snapshot: args[16], action_snapshot: args[17], priority: args[6], status: args[7], service_status: 'PENDING', assigned_to: args[18], scheduled_at: args[19], notes: args[20] }) } if (sql.includes('UPDATE maintenance_issues')) { const item = rows.get(String(args[7])); if (item) { item.status = args[0]; item.priority = args[1]; item.assigned_to = args[2]; item.scheduled_at = args[3]; item.notes = args[4]; item.service_status = item.status === 'RESOLVED' ? 'DONE' : item.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING' } } return { meta: { changes: 1 } } },
    async audit() { return undefined },
  }
  return repo
}

describe('Task 11 service tasks', () => {
  it('creates maintenance and housekeeping records in the authoritative service table', async () => { const repo = repoFactory(); const maintenance = await createServiceTask(repo as never, { service_type: 'MAINTENANCE', unit_id: 'BR·07', object_key: 'aircon', action_key: 'inspect', object_snapshot: 'Air conditioner', action_snapshot: 'Inspect', priority: 'URGENT' }, 'owner'); expect(maintenance).toMatchObject({ unit_id: 'BR·07', service_type: 'MAINTENANCE', service_status: 'PENDING' }); const housekeeping = await createServiceTask(repo as never, { service_type: 'HOUSEKEEPING', unit_id: 'BR·07', object_key: 'bathroom', action_key: 'clean', object_snapshot: 'Bathroom', action_snapshot: 'Clean', priority: 'NORMAL' }, 'owner'); expect(housekeeping.service_type).toBe('HOUSEKEEPING'); expect(repo.runs.filter(sql => sql.includes('INSERT INTO maintenance_issues'))).toHaveLength(2) })
  it('rejects a task for a non-existent Room', async () => { const repo = repoFactory(); await expect(createServiceTask(repo as never, { service_type: 'MAINTENANCE', unit_id: 'BR·99', object_key: 'x', action_key: 'y', object_snapshot: 'X', action_snapshot: 'Y' }, 'owner')).rejects.toMatchObject({ code: 'NOT_FOUND' }) })
  it('supports PENDING → IN_PROGRESS → DONE and does not reopen DONE history', async () => { const repo = repoFactory(); const task = await createServiceTask(repo as never, { service_type: 'MAINTENANCE', unit_id: 'BR·07', object_key: 'leak', action_key: 'repair', object_snapshot: 'Leak', action_snapshot: 'Repair' }, 'owner'); const started = await updateServiceTask(repo as never, String(task.id), { status: 'IN_PROGRESS' }, 'owner'); expect(started.service_status).toBe('IN_PROGRESS'); const done = await updateServiceTask(repo as never, String(task.id), { status: 'DONE' }, 'owner'); expect(done.service_status).toBe('DONE'); await expect(updateServiceTask(repo as never, String(task.id), { status: 'PENDING' }, 'owner')).rejects.toMatchObject({ code: 'TASK_FINALIZED' }) })
})
