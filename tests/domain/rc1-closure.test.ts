import { describe, expect, it } from 'vitest';
import { assertEvidenceForContext } from '../../apps/worker/src/evidence';
import { reconcileDriveUpload } from '../../apps/worker/src/drive-reconciliation';
import { settlementClosureSummary } from '../../apps/worker/src/settlement-closure';

describe('RC1 closure boundaries', () => {
  it('rejects evidence from another room or tenancy', async () => {
    const repo = { async first(sql: string) { if (sql.includes('media_records')) return { id: 'm1', entity_type: 'UNIT', entity_id: 'BR·09', status: 'ACTIVE' }; return null; } };
    await expect(assertEvidenceForContext(repo, 'm1', 'BR·07', 't1')).rejects.toMatchObject({ code: 'INVALID_EVIDENCE_CONTEXT' });
  });

  it('reconciles an uploaded Drive object into canonical media metadata', async () => {
    const statements: string[] = []; let attempt: Record<string, unknown> = { id: 'a1', google_sub: 'owner', status: 'UPLOADED', external_file_id: 'drive-1', external_reference_url: 'https://drive.google.com/open?id=drive-1', external_mime_type: 'application/pdf', entity_type: 'TENANCY', entity_id: 't1', purpose: 'TENANCY_CONTRACT', external_parent_id: 'root' };
    const repo = { async first(sql: string) { if (sql.includes('drive_upload_attempts')) return attempt; if (sql.includes('media_records')) return null; return null; }, async run(sql: string, ...args: unknown[]) { statements.push(sql); if (sql.includes('media_records')) attempt = { ...attempt, media_id: args[0] }; if (sql.includes('drive_upload_attempts')) attempt = { ...attempt, status: 'COMPLETED', media_id: args[0] }; }, async audit() {} };
    const result = await reconcileDriveUpload(repo as never, 'a1', 'owner');
    expect(result.status).toBe('COMPLETED'); expect(result.external_file_id).toBe('drive-1'); expect(statements.some(sql => sql.includes('media_records'))).toBe(true);
  });

  it('does not calculate SETTLED merely from obligations', async () => {
    const repo = { async first(sql: string) { if (sql.includes('FROM tenancies')) return { id: 't1', security_deposit_centavos: 25000 }; if (sql.includes('tenancy_checkouts')) return { id: 'c1', settlement_state: 'PAYMENT_OR_REFUND_PENDING' }; return null; }, async all(sql: string) { if (sql.includes('FROM payments')) return [{ id: 'p1', amount_centavos: 25000, type: 'SECURITY_DEPOSIT', status: 'PAID' }]; if (sql.includes('settlement_items')) return []; if (sql.includes('settlement_financial_actions')) return [{ id: 'a1', action_type: 'REFUND', amount_centavos: 25000, status: 'PENDING' }]; return []; } };
    const result = await settlementClosureSummary(repo as never, 't1');
    expect(result.settlement_state).toBe('PAYMENT_OR_REFUND_PENDING'); expect(result.refund_due_centavos).toBe(25000);
  });
});
