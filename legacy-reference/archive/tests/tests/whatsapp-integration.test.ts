import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { processWhatsAppPayload, WhatsAppSendAdapter, parseWhatsAppInbound } from '../apps/worker/src/whatsapp';
import { handleMetaEvent } from '../apps/worker/src/webhook';
import { processMessengerPayload } from '../apps/worker/src/messenger';
import { linkPersonIdentity } from '../apps/worker/src/people';
import { D1Repository } from '../apps/worker/src/repository';

// Only Graph is mocked: identity, lead creation, normalization, control, audits,
// transport persistence and the shared engine use the complete migrated schema.
function database() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync('db/migrations-rc').filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(`db/migrations-rc/${file}`, 'utf8'));
  sqlite.exec('PRAGMA foreign_keys=ON');
  let fault: ((sql: string) => boolean) | undefined;
  const prepare = (sql: string) => {
    const bind = (...values: unknown[]) => {
      const args = values.map(value => typeof value === 'boolean' ? Number(value) : value ?? null) as SQLInputValue[];
      const check = () => { if (fault?.(sql)) throw new Error('synthetic D1 failure'); };
      return {
        execute: () => { check(); return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }; },
        run: async () => { check(); return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }; },
        first: async () => { check(); return sqlite.prepare(sql).get(...args) ?? null; },
        all: async () => { check(); return { results: sqlite.prepare(sql).all(...args) }; },
      };
    };
    return { bind, ...bind() };
  };
  const db = { prepare, batch: async (statements: Array<{ execute(): unknown }>) => {
    sqlite.exec('BEGIN');
    try { const results = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } } as unknown as D1Database;
  return { sqlite, db, failWhen: (predicate?: (sql: string) => boolean) => { fault = predicate; } };
}

const envFor = (db: D1Database) => ({ DB: db, WHATSAPP_ACCESS_TOKEN: 'synthetic-only', WHATSAPP_PHONE_NUMBER_ID: '1345732791954154', WHATSAPP_WABA_ID: '2270182723822854' });
function payload(id = 'wamid.inbound.1', text = 'hm?') {
  return { object: 'whatsapp_business_account', entry: [{ id: '2270182723822854', changes: [{ field: 'messages', value: {
    messaging_product: 'whatsapp', metadata: { phone_number_id: '1345732791954154' },
    contacts: [{ wa_id: '639001234567', profile: { name: 'Synthetic acceptance person' } }],
    messages: [{ from: '639001234567', id, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: text } }],
  } }] }] };
}
async function signedRequest(body: string, secret = 'synthetic-app-secret') {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return new Request('https://rc.example/webhook', { method: 'POST', body, headers: { 'x-hub-signature-256': `sha256=${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}` } });
}

describe('WhatsApp real shared-engine acceptance', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('runs hm? through the real engine, creates canonical identity/lead and sends exactly once under concurrent replay', async () => {
    const { db, sqlite } = database();
    try {
      const graph = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'wamid.outbound.1' }] })));
      vi.stubGlobal('fetch', graph);
      const results = await Promise.all([processWhatsAppPayload(payload(), envFor(db)), processWhatsAppPayload(payload(), envFor(db))]);
      expect(results.reduce((sum, result) => sum + result.processed, 0)).toBe(1);
      expect(results.reduce((sum, result) => sum + result.duplicates, 0)).toBe(1);
      expect(graph).toHaveBeenCalledTimes(1);
      const result = results.find(item => item.processed)?.results[0];
      expect(result?.detected.intents).toContain('HM');
      expect(result?.reply).toBe('Standard rent is ₱25,000/month, with a 3-month minimum.\n\nWhen would you like to move in?');
      const identity = sqlite.prepare('SELECT * FROM person_external_identities').get();
      const lead = sqlite.prepare('SELECT * FROM leads').get();
      expect(identity?.platform).toBe('WHATSAPP'); expect(lead?.platform).toBe('WHATSAPP');
      expect(sqlite.prepare('SELECT person_id FROM person_leads WHERE lead_id=?').get(lead!.id as string)?.person_id).toBe(identity?.person_id);
      expect(sqlite.prepare("SELECT signal_key FROM person_messaging_signals WHERE person_id=? AND signal_key='PRICE_QUERY'").get(identity!.person_id as string)?.signal_key).toBe('PRICE_QUERY');
      const messages = sqlite.prepare('SELECT * FROM conversation_messages ORDER BY direction').all();
      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatchObject({ author_type: 'CUSTOMER', status: 'PROCESSED', person_id: identity?.person_id, lead_id: lead?.id });
      expect(messages[1]).toMatchObject({ author_type: 'BOT', status: 'SENT', external_message_id: 'wamid.outbound.1', person_id: identity?.person_id });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });

  it('rejects signed malformed JSON and wrong-secret signatures before any DB or Graph calls', async () => {
    expect((await handleMetaEvent(await signedRequest('{'), { META_APP_SECRET: 'synthetic-app-secret' })).status).toBe(400);
    expect((await handleMetaEvent(await signedRequest(JSON.stringify(payload()), 'wrong-secret'), { META_APP_SECRET: 'synthetic-app-secret' })).status).toBe(401);
    expect((await handleMetaEvent(await signedRequest('{}'), {})).status).toBe(503);
  });

  it('ignores real messages-field delivery/read callbacks and unrelated accounts', () => {
    const event = payload();
    const value = event.entry[0].changes[0].value;
    expect(parseWhatsAppInbound({ ...event, entry: [{ ...event.entry[0], changes: [{ field: 'messages', value: { ...value, messages: undefined, statuses: [{ id: 'wamid.out', status: 'read', recipient_id: '639001234567' }] } }] }] })).toEqual([]);
    expect(parseWhatsAppInbound(event, 'different-waba', '1345732791954154')).toEqual([]);
  });

  it.each([400, 401, 429, 500, 503])('does not blindly retry Graph HTTP %s', async status => {
    const graph = vi.fn().mockResolvedValue(new Response('{}', { status })); vi.stubGlobal('fetch', graph);
    expect(await new WhatsAppSendAdapter('synthetic-only', 'v26.0', '1345732791954154').sendText('639001234567', 'test')).toEqual({ sent: false, reason: `WHATSAPP_SEND_FAILED_${status}` });
    expect(graph).toHaveBeenCalledTimes(1);
  });

  it('treats network/timeout ambiguity as uncertain without a second send', async () => {
    const graph = vi.fn().mockRejectedValue(new DOMException('synthetic timeout', 'AbortError')); vi.stubGlobal('fetch', graph);
    expect(await new WhatsAppSendAdapter('synthetic-only', 'v26.0', '1345732791954154').sendText('639001234567', 'test')).toEqual({ sent: false, reason: 'WHATSAPP_SEND_UNCERTAIN' });
    expect(graph).toHaveBeenCalledTimes(1);
  });

  it('rolls back intake and returns 503 when D1 cannot persist the inbound message, then retries once', async () => {
    const { db, sqlite, failWhen } = database();
    try {
      const graph = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'out-retry' }] }))); vi.stubGlobal('fetch', graph);
      const event = JSON.stringify(payload());
      failWhen(sql => sql.startsWith('INSERT OR IGNORE INTO conversation_messages'));
      expect((await handleMetaEvent(await signedRequest(event), { ...envFor(db), META_APP_SECRET: 'synthetic-app-secret' })).status).toBe(503);
      expect(sqlite.prepare('SELECT * FROM channel_message_deliveries').all()).toEqual([]);
      expect(graph).not.toHaveBeenCalled(); failWhen();
      expect((await handleMetaEvent(await signedRequest(event), { ...envFor(db), META_APP_SECRET: 'synthetic-app-secret' })).status).toBe(200);
      expect(graph).toHaveBeenCalledTimes(1);
    } finally { sqlite.close(); }
  });

  it('allows a failed engine pre-send operation to be retried but not concurrently resent', async () => {
    const { db, sqlite, failWhen } = database();
    try {
      const graph = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'out-retry-engine' }] }))); vi.stubGlobal('fetch', graph);
      failWhen(sql => sql.includes('FROM messaging_aliases'));
      expect((await processWhatsAppPayload(payload(), envFor(db))).retryable).toBe(1);
      expect(graph).not.toHaveBeenCalled(); failWhen();
      await Promise.all([processWhatsAppPayload(payload(), envFor(db)), processWhatsAppPayload(payload(), envFor(db))]);
      expect(graph).toHaveBeenCalledTimes(1);
      expect(sqlite.prepare("SELECT * FROM conversation_messages WHERE direction='INBOUND'").all()).toHaveLength(1);
    } finally { sqlite.close(); }
  });

  it('retains reply intent and uncertainty after a successful send followed by D1 failure; never resends on replay', async () => {
    const { db, sqlite, failWhen } = database();
    try {
      const graph = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'external-accepted' }] }))); vi.stubGlobal('fetch', graph);
      failWhen(sql => sql.startsWith('UPDATE conversation_messages SET external_message_id='));
      expect((await processWhatsAppPayload(payload(), envFor(db))).failed).toBe(1);
      expect(sqlite.prepare('SELECT status FROM channel_message_deliveries').get()?.status).toBe('UNCERTAIN');
      expect(sqlite.prepare("SELECT text,status FROM conversation_messages WHERE direction='OUTBOUND'").get()).toMatchObject({ status: 'RECEIVED', text: expect.stringContaining('₱25,000') });
      failWhen(); await processWhatsAppPayload(payload(), envFor(db));
      expect(graph).toHaveBeenCalledTimes(1);
    } finally { sqlite.close(); }
  });

  it('does not report a HUMAN/DO_NOT_AUTO_REPLY conversation as a sent reply', async () => {
    const { db, sqlite } = database();
    try {
      const graph = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'initial-out' }] }))); vi.stubGlobal('fetch', graph);
      await processWhatsAppPayload(payload(), envFor(db));
      const personId=sqlite.prepare('SELECT person_id FROM person_external_identities').get()!.person_id as string;
      sqlite.prepare('INSERT INTO messaging_conversation_controls(id,person_id,channel,external_conversation_id,control_mode,do_not_auto_reply,updated_at) VALUES (?,?,?,?,?,?,?)').run('control-1',personId,'WHATSAPP','639001234567','HUMAN',1,new Date().toISOString());
      graph.mockClear(); await processWhatsAppPayload(payload('wamid.human.2'), envFor(db));
      expect(graph).not.toHaveBeenCalled();
      expect(sqlite.prepare("SELECT status,failure_code FROM channel_message_deliveries WHERE external_message_id='wamid.human.2'").get()).toMatchObject({ status: 'FAILED', failure_code: 'AUTO_REPLY_SUPPRESSED' });
      expect(sqlite.prepare("SELECT * FROM conversation_messages WHERE direction='OUTBOUND'").all()).toHaveLength(1);
    } finally { sqlite.close(); }
  });

  it('ignores invalid timestamps/senders and fails closed for incomplete account configuration', async () => {
    const event = payload(); event.entry[0].changes[0].value.messages[0].timestamp = '99999999999999999999';
    expect(parseWhatsAppInbound(event)).toEqual([]);
    event.entry[0].changes[0].value.messages[0].timestamp = 'bad'; expect(parseWhatsAppInbound(event)).toEqual([]);
    const { db, sqlite } = database();
    try { expect((await handleMetaEvent(await signedRequest(JSON.stringify(payload())), { DB: db, META_APP_SECRET: 'synthetic-app-secret', WHATSAPP_ACCESS_TOKEN: 'synthetic-only' })).status).toBe(503); }
    finally { sqlite.close(); }
  });

  it('uses the same real Messenger answer and permits explicit multiple channel identities on one Person', async () => {
    const { db, sqlite } = database();
    try {
      const graph = vi.fn().mockImplementation(async (url: string) => new Response(JSON.stringify(url.includes('/1345732791954154/') ? { messages: [{ id: 'wa-out' }] } : { message_id: 'messenger-out' })));
      vi.stubGlobal('fetch', graph);
      const whatsapp = await processWhatsAppPayload(payload(), envFor(db));
      const personId=sqlite.prepare('SELECT person_id FROM person_external_identities').get()!.person_id as string;
      await linkPersonIdentity(new D1Repository(db), personId, { platform: 'MESSENGER', external_id: 'synthetic-psid' });
      const messenger = await processMessengerPayload({ object: 'page', entry: [{ id: '1314972938374848', messaging: [{ sender: { id: 'synthetic-psid' }, recipient: { id: '1314972938374848' }, timestamp: Date.now(), message: { mid: 'messenger-in', text: 'hm?' } }] }] }, { DB: db, META_PAGE_TOKEN: 'synthetic-only', META_PAGE_ID: '1314972938374848' });
      expect(messenger.results[0]?.reply).toBe(whatsapp.results[0]?.reply);
      expect(sqlite.prepare('SELECT * FROM persons').all()).toHaveLength(1);
      expect(sqlite.prepare('SELECT * FROM person_external_identities WHERE person_id=?').all(personId)).toHaveLength(2);
      expect(sqlite.prepare('SELECT * FROM leads').all()).toHaveLength(2);
    } finally { sqlite.close(); }
  });

  it('rejects unsafe recipients and marks a success without a provider message ID uncertain', async () => {
    const graph = vi.fn().mockResolvedValue(new Response('{}')); vi.stubGlobal('fetch', graph);
    const adapter=new WhatsAppSendAdapter('synthetic-only','v26.0','1345732791954154');
    expect(await adapter.sendText('https://external.example', 'test')).toMatchObject({ sent: false, reason: 'INVALID_WHATSAPP_MESSAGE' });
    expect(graph).not.toHaveBeenCalled();
    expect(await adapter.sendText('639001234567', 'test')).toMatchObject({ sent: false, reason: 'WHATSAPP_SEND_UNCERTAIN' });
  });
});
