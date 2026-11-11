import { describe, expect, it } from 'vitest';
import { listTemporalItems } from '../../apps/worker/src/calendar';
import { createTask, updateTask } from '../../apps/worker/src/tasks';

describe('V2 calendar temporal projection', () => {
  it('normalizes canonical records to Manila business dates and preserves source links', async () => {
    const repo = { all: async (sql: string) => sql.includes('FROM viewings') ? [{ id: 'view-1', unit_id: 'BR·07', start_at: '2026-10-05T23:30:00Z', end_at: '2026-10-06T00:30:00Z', status: 'CONFIRMED', confirmation_status: 'CONFIRMED', person_id: 'person-1', person_name: 'Mario', channel: 'MANUAL' }] : [] };
    const items = await listTemporalItems(repo as never, { from: '2026-10-01T00:00:00+08:00', to: '2026-10-10T00:00:00+08:00' });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ event_type: 'VIEWING', date: '2026-10-06', room_id: 'BR·07', person_id: 'person-1', source_entity_type: 'VIEWING', source_entity_id: 'view-1' });
  });

  it('projects scheduled service work on its scheduled date and preserves the room link', async () => {
    const repo = { all: async (sql: string) => sql.includes('FROM maintenance_issues') ? [{ id: 'service-1', unit_id: 'BR·07', start_at: '2026-10-07T09:00:00+08:00', status: 'OPEN', priority: 'URGENT', service_type: 'HOUSEKEEPING', title: 'Deep clean', area: 'Bathroom', asset: 'Shower' }] : [] };
    const items = await listTemporalItems(repo as never, { from: '2026-10-01T00:00:00+08:00', to: '2026-10-10T00:00:00+08:00' });
    expect(items).toContainEqual(expect.objectContaining({ event_type: 'MAINTENANCE', date: '2026-10-07', room_id: 'BR·07', source_entity_id: 'service-1', metadata: expect.objectContaining({ service_type: 'HOUSEKEEPING' }) }));
  });
});

describe('operational tasks', () => {
  it('creates and completes an auditable task while validating references', async () => {
    const runs: unknown[][] = []; const audits: unknown[][] = [];
    const repo = {
      first: async (sql: string, id: string) => sql.includes('FROM persons') ? { id } : sql.includes('FROM units') ? { id } : sql.includes('FROM operational_tasks') ? { id, status: 'OPEN' } : null,
      run: async (_sql: string, ...args: unknown[]) => { runs.push(args); },
      audit: async (...args: unknown[]) => { audits.push(args); },
    };
    const created = await createTask(repo as never, { title: 'Inspect keys', due_at: '2026-10-06T09:00:00+08:00', all_day: true, unit_id: 'BR·07' }, 'owner');
    expect(created).toMatchObject({ id: expect.any(String), status: 'OPEN' });
    await updateTask(repo as never, 'task-1', { status: 'COMPLETED' }, 'owner');
    expect(runs.length).toBe(2);
    expect(audits.map(audit => audit[0])).toEqual(['CREATE', 'UPDATE']);
  });
});
