import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { D1Repository } from '../../apps/worker/src/repository';
import { promoteConfirmedViewing } from '../../apps/worker/src/messaging-intelligence';

const database = () => {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync('db/migrations-rc').filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(`db/migrations-rc/${file}`, 'utf8'));
  const prepare = (sql: string) => ({ bind: (...args: SQLInputValue[]) => ({ all: async () => ({ results: sqlite.prepare(sql).all(...args) }), first: async () => sqlite.prepare(sql).get(...args) ?? null, run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }) }) });
  const db = { prepare, batch: async (statements: Array<{ bind: () => { run: () => Promise<unknown> } }>) => statements.map(statement => statement.bind().run()) } as unknown as D1Database;
  sqlite.exec("INSERT INTO units (id,actual_unit_number,floor,type,sqm,monthly_rent_centavos,commercial_priority,status,created_at,updated_at) VALUES ('BR·07','707',7,'STUDIO',24,2500000,'HIGH','AVAILABLE','2026-10-12','2026-10-12')");
  sqlite.exec("INSERT INTO persons (id,display_name,created_at,updated_at) VALUES ('person-1','Test Tenant','2026-10-12','2026-10-12')");
  sqlite.exec("INSERT INTO leads (id,display_name,platform,external_contact_id,messenger_psid,first_seen_at,last_seen_at,status,created_at,updated_at) VALUES ('lead-1','Test Tenant','MESSENGER','psid-1','psid-1','2026-10-12','2026-10-12','VIEWING','2026-10-12','2026-10-12')");
  sqlite.exec("INSERT INTO person_leads (person_id,lead_id,linked_at,linked_by) VALUES ('person-1','lead-1','2026-10-12', 'owner')");
  return { sqlite, repo: new D1Repository(db) };
};

describe('Task 15 viewing confirmation', () => {
  it('promotes the canonical viewing to SCHEDULED/CONFIRMED and sends once', async () => {
    const { sqlite, repo } = database(); let sends = 0;
    const result = await promoteConfirmedViewing(repo, { lead_id: 'lead-1', unit_id: 'BR·07', start_at: '2026-11-01T10:00:00Z', end_at: '2026-11-01T11:00:00Z', actor: 'owner' }, { sendText: async () => { sends += 1; return { sent: true, messageId: 'provider-1' }; } });
    expect(result.viewing).toMatchObject({ status: 'SCHEDULED', confirmation_status: 'CONFIRMED', lead_id: 'lead-1', unit_id: 'BR·07' });
    expect(result.notification).toMatchObject({ status: 'SENT', providerAccepted: true });
    expect(sends).toBe(1);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM lead_events WHERE event_type='VIEWING_CONFIRMED'").get()?.count).toBe(1);
    expect(sqlite.prepare('SELECT person_id,status,external_message_id FROM conversation_messages WHERE direction=\'OUTBOUND\'').get()).toMatchObject({ person_id: 'person-1', status: 'SENT', external_message_id: 'provider-1' });
    sqlite.close();
  });

  it('is idempotent at the domain level for duplicate confirmation and does not duplicate effects', async () => {
    const { sqlite, repo } = database(); let sends = 0; const input = { lead_id: 'lead-1', unit_id: 'BR·07', start_at: '2026-11-01T10:00:00Z', end_at: '2026-11-01T11:00:00Z', actor: 'owner' };
    await promoteConfirmedViewing(repo, input, { sendText: async () => { sends += 1; return { sent: true, messageId: 'provider-1' }; } });
    const replay = await promoteConfirmedViewing(repo, input, { sendText: async () => { sends += 1; return { sent: true, messageId: 'provider-2' }; } });
    expect(replay.notification).toMatchObject({ status: 'NOT_ATTEMPTED', reason: 'ALREADY_CONFIRMED' });
    expect(sends).toBe(1);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM viewings').get()?.count).toBe(1);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM lead_events WHERE event_type='VIEWING_CONFIRMED'").get()?.count).toBe(1);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM conversation_messages WHERE direction='OUTBOUND'").get()?.count).toBe(1);
    sqlite.close();
  });

  it('records provider failure as FAILED, never SENT or DELIVERED', async () => {
    const { sqlite, repo } = database();
    const result = await promoteConfirmedViewing(repo, { lead_id: 'lead-1', unit_id: 'BR·07', start_at: '2026-11-02T10:00:00Z', end_at: '2026-11-02T11:00:00Z', actor: 'owner' }, { sendText: async () => ({ sent: false, reason: 'SEND_FAILED_403' }) });
    expect(result.viewing).toMatchObject({ status: 'SCHEDULED', confirmation_status: 'CONFIRMED' });
    expect(result.notification).toMatchObject({ status: 'FAILED', reason: 'SEND_FAILED_403', providerAccepted: false });
    expect(sqlite.prepare("SELECT status FROM conversation_messages WHERE direction='OUTBOUND'").get()?.status).toBe('FAILED');
    sqlite.close();
  });
});
