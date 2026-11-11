import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleMetaEvent, handleMetaVerification } from '../apps/worker/src/webhook';
import { parseWhatsAppInbound, processWhatsAppPayload, WhatsAppSendAdapter } from '../apps/worker/src/whatsapp';

const handle = vi.hoisted(() => vi.fn());
vi.mock('../apps/worker/src/conversation', () => ({ ConversationService: class {
  constructor(private repo: unknown, private sender?: { sendText(recipient: string, text: string): Promise<unknown> }) {}
  async handle(input: { externalContactId: string }) { const result = await handle(input); if (result.delivery && this.sender) result.delivery = await this.sender.sendText(input.externalContactId, result.reply); return result; }
} }));

const payload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: '2270182723822854',
    changes: [{
      field: 'messages',
      value: {
        messaging_product: 'whatsapp',
        metadata: { phone_number_id: '1345732791954154' },
        contacts: [{ wa_id: '639055474651', profile: { name: 'Mario Rossi' } }],
        messages: [{ from: '639055474651', id: 'wamid-1', timestamp: '1791331200', type: 'text', text: { body: 'hm?' } }],
      },
    }],
  }],
};

function database() {
  const deliveries = new Map<string, string>();
  const messages: Record<string, unknown>[] = [];
  const db = { batch: async (statements: Array<{ run(): Promise<unknown> }>) => { const results = []; for(const statement of statements) results.push(await statement.run()); return results; }, prepare: (sql: string) => ({ bind: (...args: unknown[]) => ({
    run: async () => {
      if (sql.startsWith('INSERT OR IGNORE INTO channel_message_deliveries')) {
        const key = `${args[0]}:${args[1]}:${args[2]}`;
        if (deliveries.has(key)) return { meta: { changes: 0 } };
        deliveries.set(key, String(args[3])); return { meta: { changes: 1 } };
      }
      if (sql.startsWith('UPDATE channel_message_deliveries')) {
        if(sql.includes("failure_code='WHATSAPP_RETRYABLE_PRE_SEND'"))return { meta: { changes: 0 } };
        if(sql.includes("status='UNCERTAIN'"))deliveries.set(`WHATSAPP:${args[1]}:${args[2]}`, 'UNCERTAIN');
        else deliveries.set(args.slice(-3).join(':'), String(args[0])); return { meta: { changes: 1 } };
      }
      if (sql.startsWith('INSERT INTO conversation_messages') || sql.startsWith('INSERT OR IGNORE INTO conversation_messages')) {
        if(sql.startsWith('INSERT OR IGNORE') && messages.some(item => String(item.args) === String(args) || (item.args as unknown[])[5] === args[5])) return { meta: { changes: 0 } };
        messages.push({ sql, args }); return { meta: { changes: 1 } };
      }
      return { meta: { changes: 1 } };
    },
    first: async () => sql.includes('FROM person_external_identities') ? { person_id: 'person-1' } : null,
    all: async () => ({ results: [] }),
  }) }) };
  return { db: db as unknown as D1Database, deliveries, messages };
}

async function signature(body: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return `sha256=${Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

describe('WhatsApp Cloud API transport', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'wamid-out' }] })))));
  afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

  it('parses only valid configured inbound text and ignores status/media events', () => {
    expect(parseWhatsAppInbound(payload, '2270182723822854', '1345732791954154')).toEqual([{ accountId: '2270182723822854', phoneNumberId: '1345732791954154', senderId: '639055474651', displayName: 'Mario Rossi', text: 'hm?', messageId: 'wamid-1', timestamp: 1791331200 }]);
    expect(parseWhatsAppInbound(payload, 'other-waba', 'phone-1')).toEqual([]);
    expect(parseWhatsAppInbound({ object: 'whatsapp_business_account', entry: [{ id: 'waba-1', changes: [{ field: 'statuses', value: {} }] }] }, 'waba-1', 'phone-1')).toEqual([]);
    expect(parseWhatsAppInbound({ ...payload, entry: [{ ...payload.entry[0], changes: [{ ...payload.entry[0].changes[0], value: { ...payload.entry[0].changes[0].value, messages: [{ from: 'x', id: 'm', type: 'image', image: {} }] } }] }] }, 'waba-1', 'phone-1')).toEqual([]);
  });

  it('builds the current text Messages API request without putting the token in the URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'wamid-out' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await new WhatsAppSendAdapter('secret-token', 'v26.0', '1345732791954154').sendText('639055474651', 'Hello');
    expect(result).toEqual({ sent: true, messageId: 'wamid-out' });
    expect(fetchMock).toHaveBeenCalledWith('https://graph.facebook.com/v26.0/1345732791954154/messages', expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer secret-token' }) }));
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(String(request.body)).toContain('"messaging_product":"whatsapp"');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('secret-token');
  });

  it('persists canonical inbound/outbound messages and deduplicates Meta message IDs', async () => {
    const { db, deliveries, messages } = database();
    handle.mockResolvedValue({ duplicate: false, leadId: 'lead-1', reply: 'Standard rent is ₱25,000/month, with a 3-month minimum.', delivery: { sent: true, messageId: 'wamid-out' } });
    const env = { DB: db, WHATSAPP_ACCESS_TOKEN: 'synthetic', WHATSAPP_WABA_ID: '2270182723822854', WHATSAPP_PHONE_NUMBER_ID: '1345732791954154' };
    const first = await processWhatsAppPayload(payload, env);
    const second = await processWhatsAppPayload(payload, env);
    expect(first.processed).toBe(1); expect(second.duplicates).toBe(1); expect(handle).toHaveBeenCalledTimes(1);
    expect(deliveries.get('WHATSAPP:2270182723822854:wamid-1')).toBe('SENT');
    expect(messages).toHaveLength(2);
    expect(String(messages[0].args)).toContain('WHATSAPP');
    expect(String(messages[1].args)).toContain('BOT');
  });

  it('uses the shared webhook verification and dispatches a signed WhatsApp event', async () => {
    const { db } = database();
    const body = JSON.stringify(payload); const secret = 'synthetic-app-secret'; const sig = await signature(body, secret); let background: Promise<unknown> | undefined;
    handle.mockResolvedValue({ duplicate: false, leadId: 'lead-1', reply: 'ok', delivery: { sent: true, messageId: 'out-1' } });
    const response = await handleMetaEvent(new Request('https://rc.example/webhook', { method: 'POST', body, headers: { 'x-hub-signature-256': sig } }), { DB: db, META_APP_SECRET: secret, WHATSAPP_ACCESS_TOKEN: 'synthetic', WHATSAPP_WABA_ID: '2270182723822854', WHATSAPP_PHONE_NUMBER_ID: '1345732791954154' }, { waitUntil: promise => { background = promise; } });
    expect(response.status).toBe(200); expect(background).toBeUndefined();
    expect(handle).toHaveBeenCalledWith(expect.objectContaining({ platform: 'WHATSAPP', externalContactId: '639055474651', displayName: 'Mario Rossi' }));
  });

  it('keeps verification behavior explicit and rejects malformed or unsigned events', async () => {
    expect(handleMetaVerification(new URL('https://rc.example/webhook?hub.mode=subscribe&hub.verify_token=wa-secret&hub.challenge=abc'), { META_VERIFY_TOKEN: 'wa-secret' }).status).toBe(200);
    expect((await handleMetaEvent(new Request('https://rc.example/webhook', { method: 'POST', body: '{}' }), { META_APP_SECRET: 'secret' })).status).toBe(401);
    expect((await handleMetaEvent(new Request('https://rc.example/webhook', { method: 'POST', body: '{' }), { META_APP_SECRET: 'secret' })).status).toBe(401);
  });

  it('keeps WhatsApp delivery claims and canonical message identities unique in the migration', () => {
    const db = new DatabaseSync(':memory:');
    try {
      db.exec('PRAGMA foreign_keys=ON; CREATE TABLE leads(id TEXT PRIMARY KEY); CREATE TABLE persons(id TEXT PRIMARY KEY); INSERT INTO leads VALUES (\'lead-1\'); INSERT INTO persons VALUES (\'person-1\');');
      db.exec(readFileSync('db/migrations-rc/0029_channel_messages.sql', 'utf8'));
      const claim = db.prepare('INSERT OR IGNORE INTO channel_message_deliveries(channel,external_account_id,external_message_id,status,received_at,updated_at) VALUES (?,?,?,?,?,?)');
      expect(claim.run('WHATSAPP', 'waba-1', 'wamid-1', 'PROCESSING', '2026-10-07T00:00:00Z', '2026-10-07T00:00:00Z').changes).toBe(1);
      expect(claim.run('WHATSAPP', 'waba-1', 'wamid-1', 'PROCESSING', '2026-10-07T00:00:00Z', '2026-10-07T00:00:00Z').changes).toBe(0);
      const message = db.prepare('INSERT INTO conversation_messages(id,channel,direction,external_account_id,external_conversation_id,external_message_id,message_type,text,author_type,status,lead_id,person_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
      message.run('message-1', 'WHATSAPP', 'INBOUND', 'waba-1', '639055474651', 'wamid-1', 'TEXT', 'hm?', 'CUSTOMER', 'PROCESSED', 'lead-1', 'person-1', '2026-10-07T00:00:00Z');
      expect(() => message.run('message-2', 'WHATSAPP', 'INBOUND', 'waba-1', '639055474651', 'wamid-1', 'TEXT', 'hm?', 'CUSTOMER', 'PROCESSED', 'lead-1', 'person-1', '2026-10-07T00:00:00Z')).toThrow();
    } finally { db.close(); }
  });
});
