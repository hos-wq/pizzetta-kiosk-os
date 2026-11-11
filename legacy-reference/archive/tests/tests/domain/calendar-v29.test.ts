import { describe, expect, it } from 'vitest';
import { listCalendarEvents } from '../../apps/worker/src/calendar';

describe('V2.9 calendar projection', () => {
  it('projects canonical dated records without creating a calendar truth table', async () => {
    const repo = { all: async (sql: string) => sql.includes('viewings') ? [{ kind: 'VIEWING', id: 'v1', start_at: '2026-10-05T09:00:00Z' }] : sql.includes('payments') ? [{ kind: 'PAYMENT', id: 'p1', start_at: '2026-10-06' }] : [] };
    const events = await listCalendarEvents(repo as never, {});
    expect(events.map(event => event.kind)).toEqual(['VIEWING', 'PAYMENT']);
  });
});
