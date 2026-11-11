import { describe, expect, it } from 'vitest';
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { allowedPushEndpoint, decryptPushValue, encryptPushValue, formatAttentionPush, generateVapidKeys, validateSubscription } from '../apps/worker/src/web-push';

const b64url = (bytes: Uint8Array) => { let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); };

describe('BR Mobile Web Push foundation', () => {
  it('encrypts persisted subscription/key material and binds it to its purpose', async () => {
    const encrypted = await encryptPushValue('test session secret', 'subscription-v1:device-a', 'opaque subscription');
    await expect(decryptPushValue('test session secret', 'subscription-v1:device-a', encrypted.ciphertext, encrypted.iv)).resolves.toBe('opaque subscription');
    await expect(decryptPushValue('wrong secret', 'subscription-v1:device-a', encrypted.ciphertext, encrypted.iv)).rejects.toThrow();
    await expect(decryptPushValue('test session secret', 'subscription-v1:device-b', encrypted.ciphertext, encrypted.iv)).rejects.toThrow();
  });

  it('accepts Apple/Firebase push origins and rejects insecure or arbitrary endpoints', () => {
    expect(allowedPushEndpoint('https://web.push.apple.com/a/b')).toBe(true);
    expect(allowedPushEndpoint('https://fcm.googleapis.com/fcm/send/a')).toBe(true);
    expect(allowedPushEndpoint('http://web.push.apple.com/a')).toBe(false);
    expect(allowedPushEndpoint('https://evil.example/a')).toBe(false);
    expect(allowedPushEndpoint('https://web.push.apple.com.evil.example/a')).toBe(false);
  });

  it('validates a browser subscription before persistence', () => {
    const value = { endpoint: 'https://web.push.apple.com/device/token', expirationTime: null, keys: { p256dh: 'A'.repeat(87), auth: 'B'.repeat(22) } };
    expect(validateSubscription(value)).toEqual(value);
    expect(() => validateSubscription({ ...value, endpoint: 'https://evil.example/ssrf' })).toThrow('Invalid browser push subscription');
    expect(() => validateSubscription({ ...value, keys: { ...value.keys, auth: 'not a valid key!' } })).toThrow('Invalid browser push subscription');
  });

  it('generates VAPID keys and builds an encrypted RFC 8291 push request', async () => {
    const vapid = await generateVapidKeys();
    const receiver = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
    const receiverPublic = await crypto.subtle.exportKey('raw', receiver.publicKey) as ArrayBuffer;
    const p256dh = b64url(new Uint8Array(receiverPublic));
    const auth = b64url(crypto.getRandomValues(new Uint8Array(16)));
    const request = await buildPushPayload({ data: { title: 'BR OS', body: 'Attention', url: '/v2/mobile/attention' }, options: { ttl: 60, urgency: 'high' } }, { endpoint: 'https://web.push.apple.com/device/test', expirationTime: null, keys: { p256dh, auth } }, { subject: 'mailto:boutiquerooms.makati@gmail.com', publicKey: vapid.publicKey, privateKey: vapid.privateKey });
    expect(request.method).toBe('post');
    expect(request.headers['content-encoding']).toBe('aes128gcm');
    expect(request.headers.authorization).toMatch(/^vapid t=/);
    expect(request.body.byteLength).toBeGreaterThan(0);
  });
  it('supports a numeric badge count in the encrypted payload contract', async () => {
    const vapid = await generateVapidKeys();
    const receiver = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
    const receiverPublic = await crypto.subtle.exportKey('raw', receiver.publicKey) as ArrayBuffer;
    const request = await buildPushPayload({ data: { title: 'BR OS', body: 'Attention', url: '/v2/mobile/attention', badgeCount: 3 }, options: { ttl: 60, urgency: 'high' } }, { endpoint: 'https://web.push.apple.com/device/test', expirationTime: null, keys: { p256dh: b64url(new Uint8Array(receiverPublic)), auth: b64url(crypto.getRandomValues(new Uint8Array(16))) } }, { subject: 'mailto:boutiquerooms.makati@gmail.com', publicKey: vapid.publicKey, privateKey: vapid.privateKey });
    expect(request.body.byteLength).toBeGreaterThan(0);
  });

  it('formats a real attention notification with person, signal, detail and channel', () => {
    expect(formatAttentionPush({
      display_name: 'Allan Passoto',
      channel: 'MESSENGER',
      priority: 'HIGH',
      signal_key: 'VIEWING_DATE_PROPOSED',
      value_json: JSON.stringify({ date: '2026-10-12', confirmed: false }),
    })).toEqual({
      title: 'BR OS · HIGH',
      body: 'Allan Passoto · Viewing Date Proposed · Date: 2026-10-12 · Confirmed: false · MESSENGER',
    });
  });

  it('keeps internal alerts informative without requiring a signal record', () => {
    expect(formatAttentionPush({ display_name: 'Alan Pasotto', channel: 'INTERNAL', priority: 'HIGH', signal_key: 'TEST_ALAN_NEEDS' })).toEqual({
      title: 'BR OS · HIGH',
      body: 'Alan Pasotto · Test Alan Needs · INTERNAL',
    });
  });
});
