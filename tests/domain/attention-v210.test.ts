import { describe, expect, it } from 'vitest';
import { getAttentionItems } from '../../apps/worker/src/attention';

describe('V2.10 attention center', () => {
  it('aggregates only real operational attention sources', async () => {
    const repo = { all: async (sql: string) => sql.includes('maintenance_issues') ? [{ kind: 'MAINTENANCE', id: 'm1', priority: 'URGENT', due_at: '2026-10-05T01:00:00Z' }] : sql.includes('turnover_tasks') ? [{ kind: 'TURNOVER', id: 't1', due_at: '2026-10-06T01:00:00Z' }] : [], first: async () => null };
    const items = await getAttentionItems(repo as never, new Date('2026-10-05T00:00:00Z'));
    expect(items.map(item => item.kind)).toEqual(['MAINTENANCE', 'TURNOVER']);
  });
});
