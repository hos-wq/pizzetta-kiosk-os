import { describe, expect, it } from 'vitest';
import { handleMetaEvent, handleMetaVerification } from '../apps/worker/src/webhook';

const env = { META_VERIFY_TOKEN: 'local-verification-token', META_APP_SECRET: 'local-app-secret' };

async function signature(body: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return `sha256=${Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

describe('Meta Messenger webhook foundation', () => {
  it('returns the challenge for valid GET verification', async () => {
    const response = handleMetaVerification(new URL('https://example.com/webhook?hub.mode=subscribe&hub.verify_token=local-verification-token&hub.challenge=challenge-123'), env);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('challenge-123');
  });

  it('rejects an invalid verify token', () => {
    const response = handleMetaVerification(new URL('https://example.com/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=challenge-123'), env);
    expect(response.status).toBe(403);
  });

  it('rejects missing verification parameters', () => {
    const response = handleMetaVerification(new URL('https://example.com/webhook?hub.mode=subscribe'), env);
    expect(response.status).toBe(403);
  });

  it('acknowledges a valid signed POST without side effects', async () => {
    const body = JSON.stringify({ object: 'page', entry: [] });
    const response = await handleMetaEvent(new Request('https://example.com/webhook', { method: 'POST', body, headers: { 'x-hub-signature-256': await signature(body, env.META_APP_SECRET) } }), env);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('EVENT_RECEIVED');
  });

  it('rejects an invalid POST signature', async () => {
    const response = await handleMetaEvent(new Request('https://example.com/webhook', { method: 'POST', body: JSON.stringify({ object: 'page', entry: [] }), headers: { 'x-hub-signature-256': 'sha256=' + '0'.repeat(64) } }), env);
    expect(response.status).toBe(401);
  });
});
