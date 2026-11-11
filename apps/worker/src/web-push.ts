import { buildPushPayload, type PushSubscription, type VapidKeys } from '@block65/webcrypto-web-push';
import { ApiError, D1Repository, now } from './repository';

export type WebPushEnv = { DB: D1Database; AUTH_SESSION_SECRET?: string };
export type BrowserPushSubscription = PushSubscription & { expirationTime: number | null };
const CONFIG_ID = 'owner-v1';
const enc = new TextEncoder();
const bytesToBase64Url = (bytes: Uint8Array) => { let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); };
const base64UrlToBytes = (value: string) => { const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='); const binary = atob(normalized); return Uint8Array.from(binary, character => character.charCodeAt(0)); };
const storageKey = async (secret: string, purpose: string) => {
  const material = await crypto.subtle.importKey('raw', enc.encode(secret), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('BR OS web push storage v1'), info: enc.encode(purpose) }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
};
export async function encryptPushValue(secret: string, purpose: string, value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12)); const key = await storageKey(secret, purpose);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(purpose) }, key, enc.encode(value)));
  return { ciphertext: bytesToBase64Url(ciphertext), iv: bytesToBase64Url(iv) };
}
export async function decryptPushValue(secret: string, purpose: string, ciphertext: string, iv: string) {
  const key = await storageKey(secret, purpose);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64UrlToBytes(iv), additionalData: enc.encode(purpose) }, key, base64UrlToBytes(ciphertext));
  return new TextDecoder().decode(plaintext);
}

export const allowedPushEndpoint = (endpoint: string) => {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && (url.hostname === 'push.apple.com' || url.hostname.endsWith('.push.apple.com') || url.hostname === 'fcm.googleapis.com');
  } catch { return false; }
};

export async function generateVapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' } as SubtleCryptoGenerateKeyAlgorithm, true, ['sign', 'verify']) as CryptoKeyPair;
  const publicRawBuffer = await crypto.subtle.exportKey('raw', pair.publicKey) as ArrayBuffer;
  const publicRaw = new Uint8Array(publicRawBuffer);
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey) as JsonWebKey;
  if (!privateJwk.d || publicRaw.length !== 65 || publicRaw[0] !== 4) throw new Error('Unable to create Web Push signing keys');
  return { publicKey: bytesToBase64Url(publicRaw), privateKey: privateJwk.d };
}

async function ensureVapidConfig(repo: D1Repository, secret: string, includePrivateKey = true) {
  let config = await repo.first('SELECT public_key,private_key_ciphertext,private_key_iv FROM web_push_vapid_config WHERE id=?', CONFIG_ID);
  if (!config) {
    const pair = await generateVapidKeys(); const encrypted = await encryptPushValue(secret, 'vapid-private-v1', pair.privateKey);
    await repo.run('INSERT OR IGNORE INTO web_push_vapid_config (id,public_key,private_key_ciphertext,private_key_iv,created_at) VALUES (?,?,?,?,?)', CONFIG_ID, pair.publicKey, encrypted.ciphertext, encrypted.iv, now());
    config = await repo.first('SELECT public_key,private_key_ciphertext,private_key_iv FROM web_push_vapid_config WHERE id=?', CONFIG_ID);
  }
  if (!config) throw new ApiError(503, 'PUSH_KEY_UNAVAILABLE', 'Push notifications are not configured');
  const privateKey = includePrivateKey ? await decryptPushValue(secret, 'vapid-private-v1', String(config.private_key_ciphertext), String(config.private_key_iv)) : undefined;
  return { publicKey: String(config.public_key), privateKey };
}

export async function getWebPushPublicKey(env: WebPushEnv) {
  if (!env.AUTH_SESSION_SECRET) throw new ApiError(503, 'PUSH_NOT_CONFIGURED', 'Push notifications are not configured');
  return { public_key: (await ensureVapidConfig(new D1Repository(env.DB), env.AUTH_SESSION_SECRET, false)).publicKey };
}

export function validateSubscription(value: unknown): BrowserPushSubscription {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(422, 'INVALID_PUSH_SUBSCRIPTION', 'Invalid browser push subscription');
  const input = value as Record<string, unknown>; const keys = input.keys;
  if (typeof input.endpoint !== 'string' || input.endpoint.length > 2048 || !allowedPushEndpoint(input.endpoint) || (input.expirationTime !== null && input.expirationTime !== undefined && (typeof input.expirationTime !== 'number' || !Number.isFinite(input.expirationTime))) || !keys || typeof keys !== 'object' || Array.isArray(keys)) throw new ApiError(422, 'INVALID_PUSH_SUBSCRIPTION', 'Invalid browser push subscription');
  const record = keys as Record<string, unknown>;
  if (typeof record.p256dh !== 'string' || !/^[A-Za-z0-9_-]{40,200}$/.test(record.p256dh) || typeof record.auth !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(record.auth)) throw new ApiError(422, 'INVALID_PUSH_SUBSCRIPTION', 'Invalid browser push subscription');
  return { endpoint: input.endpoint, expirationTime: typeof input.expirationTime === 'number' ? input.expirationTime : null, keys: { p256dh: record.p256dh, auth: record.auth } };
}

export async function saveWebPushSubscription(repo: D1Repository, env: WebPushEnv, ownerSubject: string, value: unknown) {
  if (!env.AUTH_SESSION_SECRET) throw new ApiError(503, 'PUSH_NOT_CONFIGURED', 'Push notifications are not configured');
  const subscription = validateSubscription(value); const endpointHash = bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(subscription.endpoint))));
  const encrypted = await encryptPushValue(env.AUTH_SESSION_SECRET, `subscription-v1:${endpointHash}`, JSON.stringify(subscription)); const timestamp = now();
  await ensureVapidConfig(repo, env.AUTH_SESSION_SECRET, false);
  await repo.run('INSERT INTO web_push_subscriptions (endpoint_hash,owner_subject,subscription_ciphertext,subscription_iv,created_at,updated_at,revoked_at) VALUES (?,?,?,?,?,?,NULL) ON CONFLICT(endpoint_hash) DO UPDATE SET owner_subject=excluded.owner_subject,subscription_ciphertext=excluded.subscription_ciphertext,subscription_iv=excluded.subscription_iv,updated_at=excluded.updated_at,revoked_at=NULL', endpointHash, ownerSubject, encrypted.ciphertext, encrypted.iv, timestamp, timestamp);
  await repo.audit('SUBSCRIBE', 'web_push_subscription', endpointHash, { owner_subject: ownerSubject, endpoint_host: new URL(subscription.endpoint).hostname });
  return { subscribed: true };
}

export async function revokeWebPushSubscription(repo: D1Repository, env: WebPushEnv, ownerSubject: string, endpoint: unknown) {
  if (!env.AUTH_SESSION_SECRET || typeof endpoint !== 'string' || !allowedPushEndpoint(endpoint)) throw new ApiError(422, 'INVALID_PUSH_SUBSCRIPTION', 'Invalid browser push subscription');
  const endpointHash = bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(endpoint))));
  await repo.run('UPDATE web_push_subscriptions SET revoked_at=?,updated_at=? WHERE endpoint_hash=? AND owner_subject=? AND revoked_at IS NULL', now(), now(), endpointHash, ownerSubject);
  await repo.audit('REVOKE', 'web_push_subscription', endpointHash, { owner_subject: ownerSubject });
  return { revoked: true };
}

async function sendPush(repo: D1Repository, env: WebPushEnv, eventKey: string, payload: { title: string; body: string; url: string; badgeCount?: number }, ownerSubject?: string) {
  if (!env.AUTH_SESSION_SECRET) return { sent: 0, failed: 0 };
  const vapid = await ensureVapidConfig(repo, env.AUTH_SESSION_SECRET);
  const subscriptions = await repo.all(`SELECT endpoint_hash,owner_subject,subscription_ciphertext,subscription_iv FROM web_push_subscriptions WHERE revoked_at IS NULL${ownerSubject ? ' AND owner_subject=?' : ''}`, ...(ownerSubject ? [ownerSubject] : []));
  let sent = 0, failed = 0;
  for (const row of subscriptions) {
    const endpointHash = String(row.endpoint_hash); const attemptAt = now();
    const claim = await repo.run("INSERT INTO web_push_deliveries (event_key,endpoint_hash,status,attempted_at) VALUES (?,?, 'SENDING',?) ON CONFLICT(event_key,endpoint_hash) DO UPDATE SET status='SENDING',attempted_at=excluded.attempted_at,response_status=NULL WHERE web_push_deliveries.status='FAILED' OR (web_push_deliveries.status='SENDING' AND web_push_deliveries.attempted_at < ?)", eventKey, endpointHash, attemptAt, new Date(Date.now() - 120000).toISOString());
    if (!claim.meta.changes) continue;
    try {
      const subscription = JSON.parse(await decryptPushValue(env.AUTH_SESSION_SECRET, `subscription-v1:${endpointHash}`, String(row.subscription_ciphertext), String(row.subscription_iv))) as BrowserPushSubscription;
      if (!allowedPushEndpoint(subscription.endpoint)) throw new Error('PUSH_ENDPOINT_REJECTED');
      const options = await buildPushPayload({ data: payload, options: { ttl: 300, urgency: 'high', topic: 'br-attention' } }, subscription, { subject: 'mailto:boutiquerooms.makati@gmail.com', publicKey: vapid.publicKey, privateKey: vapid.privateKey } satisfies VapidKeys);
      const response = await fetch(subscription.endpoint, { ...options, signal: AbortSignal.timeout(8000) });
      await repo.run('UPDATE web_push_deliveries SET status=?,sent_at=?,response_status=? WHERE event_key=? AND endpoint_hash=?', response.ok ? 'SENT' : 'FAILED', response.ok ? now() : null, response.status, eventKey, endpointHash);
      if (response.status === 404 || response.status === 410) await repo.run('UPDATE web_push_subscriptions SET revoked_at=?,updated_at=? WHERE endpoint_hash=?', now(), now(), endpointHash);
      if (response.ok) sent++; else failed++;
    } catch {
      await repo.run("UPDATE web_push_deliveries SET status='FAILED',sent_at=NULL,response_status=NULL WHERE event_key=? AND endpoint_hash=?", eventKey, endpointHash);
      failed++;
    }
  }
  return { sent, failed };
}

export async function sendOwnerTestPush(repo: D1Repository, env: WebPushEnv, ownerSubject: string) {
  const openAttention = Number((await repo.first("SELECT COUNT(*) AS count FROM messaging_attention WHERE status='OPEN'"))?.count ?? 0);
  const attention = await repo.first(`SELECT a.id,p.display_name,a.channel,a.priority,a.signal_key,s.value_json
    FROM messaging_attention a
    LEFT JOIN persons p ON p.id=a.person_id
    LEFT JOIN person_messaging_signals s ON s.id=a.signal_id
    WHERE a.status='OPEN' ORDER BY CASE a.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'INTERESTING' THEN 2 ELSE 3 END,a.updated_at DESC LIMIT 1`);
  const message = attention ? formatAttentionPush(attention as Record<string, unknown>) : { title: 'BR OS', body: 'Le notifiche BR Mobile sono attive.' };
  const url = attention ? `/v2/mobile/attention?attentionId=${encodeURIComponent(String(attention.id))}` : '/v2/mobile/attention';
  const result = await sendPush(repo, env, `test:${crypto.randomUUID()}`, { ...message, url, badgeCount: Math.max(1, openAttention) }, ownerSubject);
  return { ...result, subscriptions: Number((await repo.first('SELECT COUNT(*) AS count FROM web_push_subscriptions WHERE owner_subject=? AND revoked_at IS NULL', ownerSubject))?.count ?? 0) };
}

const humanizeSignal = (value: string) => value
  .toLowerCase()
  .split('_')
  .map(part => part ? part[0].toUpperCase() + part.slice(1) : part)
  .join(' ');

const signalDetail = (value: unknown) => {
  if (typeof value !== 'string' || !value) return '';
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const parts = Object.entries(parsed)
      .filter(([, item]) => item !== null && item !== undefined && item !== '')
      .map(([key, item]) => `${humanizeSignal(key)}: ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`);
    return parts.join(' · ');
  } catch { return value; }
};

export const formatAttentionPush = (attention: Record<string, unknown>) => {
  const person = String(attention.display_name ?? 'New conversation').trim() || 'New conversation';
  const channel = String(attention.channel ?? 'MESSAGING').trim().toUpperCase();
  const priority = String(attention.priority ?? 'NORMAL').trim().toUpperCase();
  const signal = String(attention.signal_key ?? 'ATTENTION').trim();
  const detail = signalDetail(attention.value_json);
  const title = `BR OS · ${priority}`.slice(0, 80);
  const body = `${person} · ${humanizeSignal(signal)}${detail ? ` · ${detail}` : ''} · ${channel}`.slice(0, 240);
  return { title, body };
};

export async function notifyNewAttention(repo: D1Repository, env: WebPushEnv, attentionId: string) {
  try {
    const openAttention = Number((await repo.first("SELECT COUNT(*) AS count FROM messaging_attention WHERE status='OPEN'"))?.count ?? 1);
    const attention = await repo.first(`SELECT p.display_name,a.channel,a.priority,a.signal_key,s.value_json
      FROM messaging_attention a
      LEFT JOIN persons p ON p.id=a.person_id
      LEFT JOIN person_messaging_signals s ON s.id=a.signal_id
      WHERE a.id=?`, attentionId);
    const message = formatAttentionPush((attention ?? { signal_key: 'ATTENTION' }) as Record<string, unknown>);
    return await sendPush(repo, env, `attention:${attentionId}`, { ...message, url: `/v2/mobile/attention?attentionId=${encodeURIComponent(attentionId)}`, badgeCount: Math.max(1, openAttention) });
  }
  catch { return { sent: 0, failed: 0 }; }
}
