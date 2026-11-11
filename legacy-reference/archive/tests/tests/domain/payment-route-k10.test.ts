import { describe, expect, it } from 'vitest';
import { createPaymentRoute } from '../../apps/worker/src/payment-route';

function request(body: unknown, key?: string) {
  return new Request('https://br.test/api/v1/payments', { method: 'POST', headers: { 'content-type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, body: JSON.stringify(body) });
}

describe('K10 payment idempotency', () => {
  it('requires a key', async () => {
    const repo = { async first() { return null; }, async run() {}, async batch() {}, async audit() {} };
    await expect(createPaymentRoute(repo as never, request({ tenancy_id: 't1', due_date: '2026-10-06', amount_centavos: 100, type: 'RENT', status: 'DUE' }), 'owner')).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REQUIRED' });
  });

  it('posts PAID payment with the journal link in the correct column and replays it', async () => {
    let mutation: Record<string, unknown> | null = null; let batches = 0; let payment: Record<string, unknown> | null = null;
    const repo = {
      async first(sql: string, ...args: unknown[]) {
        if (sql.includes('mutation_requests')) return mutation;
        if (sql.includes('FROM tenancies')) return { id: 't1', unit_id: 'BR·07', person_id: 'p1' };
        if (sql.includes('chart_accounts')) return { id: String(args[0]) };
        if (sql.includes('FROM payments')) return payment;
        return null;
      },
      async run(sql: string, ...args: unknown[]) { if (sql.includes('INSERT INTO mutation_requests')) mutation = { id: args[0], idempotency_key: args[1], actor: args[2], operation: args[3], request_hash: args[4], status: 'IN_PROGRESS' }; if (sql.includes('UPDATE mutation_requests')) mutation = { ...mutation, status: 'SUCCEEDED', response_status: args[0], response_json: args[1] }; },
      async batch(statements: Array<{ sql: string; args?: unknown[] }>) { batches += 1; const insert = statements.find(statement => statement.sql.startsWith('INSERT INTO payments')); if (insert) payment = { id: insert.args?.[0], journal_entry_id: insert.args?.[9], status: 'PAID', amount_centavos: insert.args?.[3] }; },
      async audit() {},
    };
    const body = { tenancy_id: 't1', due_date: '2026-10-06', amount_centavos: 100, type: 'RENT', status: 'PAID', method: 'CASH' };
    await createPaymentRoute(repo as never, request(body, 'pay-1'), 'owner');
    expect((payment as Record<string, unknown> | null)?.journal_entry_id).toBeTruthy(); expect(batches).toBe(1);
    await createPaymentRoute(repo as never, request(body, 'pay-1'), 'owner');
    expect(batches).toBe(1);
  });
});
