import { describe, expect, it } from 'vitest';
import { createDriveDocumentWithReconciliation } from '../../apps/worker/src/drive-reconciliation';

describe('K12 Drive upload reconciliation', () => {
  it('creates an attempt before upload and marks failed workflows for reconciliation', async () => {
    const statements: string[] = [];
    const repo = {
      async run(sql: string) { statements.push(sql); },
      async first(sql: string) { return sql.includes('persons') ? { id: 'person-1' } : null; },
      async audit() {},
    };
    await expect(createDriveDocumentWithReconciliation(repo as never, { AUTH_SESSION_SECRET: 'local' }, { subject: 'owner', email: 'owner@example.com', role: 'OWNER' }, { entity_type: 'PERSON', entity_id: 'person-1', purpose: 'PERSON_ID_DOCUMENT', file: new File(['x'], 'id.jpg', { type: 'image/jpeg' }) })).rejects.toMatchObject({ code: 'DRIVE_NOT_CONFIGURED' });
    expect(statements[0]).toContain('INSERT INTO drive_upload_attempts');
    expect(statements.at(-1)).toContain("status='RECONCILE_REQUIRED'");
  });
});
