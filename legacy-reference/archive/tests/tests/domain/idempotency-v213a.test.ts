import { describe, expect, it } from 'vitest';
import { ApiError } from '../../apps/worker/src/repository';
import { beginMutation, completeMutation, requestHash } from '../../apps/worker/src/idempotency';

function repoFactory() {
  const rows: Record<string, unknown>[] = [];
  return { rows, async first(sql: string, ...args: unknown[]) { return rows.find(row => sql.includes('WHERE actor') && row.actor === args[0] && row.operation === args[1] && row.idempotency_key === args[2]) ?? null; }, async run(sql: string, ...args: unknown[]) { if (sql.startsWith('INSERT')) rows.push({ id: args[0], idempotency_key: args[1], actor: args[2], operation: args[3], request_hash: args[4], status: args[5] }); else if (sql.includes("status='SUCCEEDED'")) { const row = rows.find(item => item.id === args[3]); if (row) Object.assign(row, { status: 'SUCCEEDED', response_status: args[0], response_json: args[1] }); } else if (sql.includes("status='FAILED'")) { const row = rows.find(item => item.id === args[1]); if (row) row.status = 'FAILED'; } }, async batch() {} };
}

describe('V2.13A mutation idempotency foundation', () => {
  it('hashes objects deterministically regardless of key order', async () => { await expect(requestHash({ b: 2, a: 1 })).resolves.toBe(await requestHash({ a: 1, b: 2 })); });
  it('replays a completed mutation for the same actor, operation and key', async () => { const repo = repoFactory(); const first = await beginMutation(repo as never, 'owner', 'journal.post', 'key-1', { amount: 100 }); expect(first?.kind).toBe('NEW'); await completeMutation(repo as never, (first as { id: string }).id, 201, { id: 'journal-1' }); await expect(beginMutation(repo as never, 'owner', 'journal.post', 'key-1', { amount: 100 })).resolves.toEqual({ kind: 'REPLAY', status: 201, body: { id: 'journal-1' } }); });
  it('rejects key reuse with a different request', async () => { const repo = repoFactory(); await beginMutation(repo as never, 'owner', 'journal.post', 'key-1', { amount: 100 }); await expect(beginMutation(repo as never, 'owner', 'journal.post', 'key-1', { amount: 101 })).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' }); });
  it('does not share keys between actors or operations', async () => { const repo = repoFactory(); const first = await beginMutation(repo as never, 'owner', 'journal.post', 'same', { amount: 100 }); expect((await beginMutation(repo as never, 'other', 'journal.post', 'same', { amount: 100 }))?.kind).toBe('NEW'); expect((await beginMutation(repo as never, 'owner', 'settlement.post', 'same', { amount: 100 }))?.kind).toBe('NEW'); expect(first?.kind).toBe('NEW'); });
  it('rejects an in-flight duplicate', async () => { const repo = repoFactory(); await beginMutation(repo as never, 'owner', 'journal.post', 'same', { amount: 100 }); await expect(beginMutation(repo as never, 'owner', 'journal.post', 'same', { amount: 100 })).rejects.toBeInstanceOf(ApiError); });
});
