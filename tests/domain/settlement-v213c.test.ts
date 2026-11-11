import { describe, expect, it } from 'vitest';
import { settlementSummary } from '../../apps/worker/src/settlement';

const repo = (payments: Record<string, unknown>[], items: Record<string, unknown>[]) => ({ async first(sql: string) { return sql.includes('tenancies') ? { id: 't1', security_deposit_centavos: 50000 } : null; }, async all(sql: string) { return sql.includes('payments') ? payments : items; } });

describe('V2.13C settlement integration', () => {
  it('does not treat an unpaid agreed deposit as held cash', async () => { const result = await settlementSummary(repo([], []) as never, 't1'); expect(result.security_deposit_held_centavos).toBe(0); expect(result.refund_due_centavos).toBe(0); expect(result.agreed_security_deposit_centavos).toBe(50000); });
  it('charges deductions above the held deposit as amount due', async () => { const result = await settlementSummary(repo([{ type: 'SECURITY_DEPOSIT', status: 'PAID', amount_centavos: 50000 }], [{ amount_centavos: 70000 }]) as never, 't1'); expect(result.amount_due_centavos).toBe(20000); expect(result.refund_due_centavos).toBe(0); });
});
