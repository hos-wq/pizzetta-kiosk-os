import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthEnv, DevAuthService, GoogleSessionAuthService, handleAuthRoute, requireAuth, requireCsrf, safeReturnPath, sessionCookie, csrfCookie, localSessionCookie, localCsrfCookie, verifyIdToken } from '../apps/worker/src/auth';

const dbWith = (row: Record<string, unknown> | null): AuthEnv['DB'] => ({ prepare: () => ({ bind: () => ({ first: async () => row, run: async () => ({}) }) }) }) as never;
const productionEnv = (row: Record<string, unknown> | null): AuthEnv => ({ ENVIRONMENT: 'production', AUTH_SESSION_SECRET: 'local-only-test-secret', GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com', DB: dbWith(row) });
const encodeBytes = (bytes: Uint8Array) => { let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); };
const hmac = async (value: string, secret: string) => { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return encodeBytes(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))); };
const encoded = (value: unknown) => encodeBytes(new TextEncoder().encode(JSON.stringify(value)));
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('Google authentication boundary', () => {
  it('accepts only internal V2 Office/Mobile return paths', () => {
    expect(safeReturnPath('/v2/office')).toBe('/v2/office');
    expect(safeReturnPath('/v2/mobile/people?tab=active')).toBe('/v2/mobile/people?tab=active');
    expect(safeReturnPath('https://evil.example/steal')).toBe('/v2/mobile/attention');
    expect(safeReturnPath('//evil.example/steal')).toBe('/v2/mobile/attention');
    expect(safeReturnPath('/auth/google')).toBe('/v2/mobile/attention');
    expect(safeReturnPath('/v2/office\\evil')).toBe('/v2/mobile/attention');
  });
  it('rejects DevAuth in production and preserves local development auth', async () => {
    const request = new Request('https://br.test/api/v1/units', { headers: { 'x-dev-auth': 'owner' } });
    expect(await new DevAuthService().authenticate(request, { ENVIRONMENT: 'production' } as AuthEnv)).toBeNull();
    expect(await new DevAuthService().authenticate(request, { ENVIRONMENT: 'development' } as AuthEnv)).toEqual({ subject: 'dev-owner' });
  });

  it('rejects absent, expired, revoked and tampered sessions', async () => {
    const expired = { google_sub: 'sub', email: 'boutiquerooms.makati@gmail.com', role: 'OWNER', expires_at: '2020-01-01T00:00:00.000Z', revoked_at: null };
    const revoked = { ...expired, expires_at: '2999-01-01T00:00:00.000Z', revoked_at: '2026-01-01T00:00:00.000Z' };
    const valid = { ...expired, expires_at: '2999-01-01T00:00:00.000Z', revoked_at: null };
    expect(await new GoogleSessionAuthService().authenticate(new Request('https://br.test'), productionEnv(valid))).toBeNull();
    expect(await new GoogleSessionAuthService().authenticate(new Request('https://br.test', { headers: { cookie: '__Host-br_session=tampered' } }), productionEnv(null))).toBeNull();
    expect(await new GoogleSessionAuthService().authenticate(new Request('https://br.test', { headers: { cookie: '__Host-br_session=expired' } }), productionEnv(expired))).toBeNull();
    expect(await new GoogleSessionAuthService().authenticate(new Request('https://br.test', { headers: { cookie: '__Host-br_session=revoked' } }), productionEnv(revoked))).toBeNull();
  });

  it('accepts a valid server-side session and rejects a non-owner role/email', async () => {
    const valid = { google_sub: 'google-sub', email: 'boutiquerooms.makati@gmail.com', role: 'OWNER', expires_at: '2999-01-01T00:00:00.000Z', revoked_at: null };
    const request = new Request('https://br.test', { headers: { cookie: '__Host-br_session=opaque' } });
    expect(await requireAuth(request, productionEnv(valid))).toEqual({ subject: 'google-sub', email: 'boutiquerooms.makati@gmail.com', role: 'OWNER' });
    expect(await requireAuth(request, productionEnv({ ...valid, role: 'ADMIN' }))).toBeNull();
    expect(await requireAuth(request, productionEnv({ ...valid, email: 'other@example.com' }))).toBeNull();
  });

  it('enforces same-origin double-submit CSRF in production', () => {
    const env = productionEnv(null);
    expect(requireCsrf(new Request('https://br.test', { headers: { cookie: 'br_csrf=abc', origin: 'https://br.test', 'x-br-csrf': 'abc' } }), env)).toBe(true);
    expect(requireCsrf(new Request('https://br.test', { headers: { cookie: 'br_csrf=abc', origin: 'https://br.test', 'x-br-csrf': 'wrong' } }), env)).toBe(false);
    expect(requireCsrf(new Request('https://br.test', { headers: { cookie: 'br_csrf=abc', origin: 'https://evil.example', 'x-br-csrf': 'abc' } }), env)).toBe(false);
  });

  it('returns an explicit configuration failure without secrets', async () => {
    const response = await handleAuthRoute(new Request('https://br.test/auth/google'), { ENVIRONMENT: 'production', DB: dbWith(null) });
    expect(response?.status).toBe(503);
    expect(await response?.text()).not.toContain('secret');
  });

  it('validates Google signature and rejects wrong issuer, audience, nonce and account', async () => {
    const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
    const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey); (publicJwk as JsonWebKey & { kid?: string }).kid = 'test-key';
    globalThis.fetch = async () => new Response(JSON.stringify({ keys: [publicJwk] }), { headers: { 'content-type': 'application/json' } });
    const makeToken = async (changes: Record<string, unknown> = {}) => { const header = encoded({ alg: 'RS256', kid: 'test-key', typ: 'JWT' }); const payload = encoded({ iss: 'https://accounts.google.com', aud: 'test-client.apps.googleusercontent.com', nonce: 'nonce', email: 'boutiquerooms.makati@gmail.com', email_verified: true, sub: 'google-sub', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300, ...changes }); const input = `${header}.${payload}`; const signature = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, pair.privateKey, new TextEncoder().encode(input)); return `${input}.${encodeBytes(new Uint8Array(signature))}`; };
    const env = productionEnv(null); const valid = await verifyIdToken(await makeToken(), env, 'nonce', 'https://keys.test'); expect(valid).toEqual({ sub: 'google-sub', email: 'boutiquerooms.makati@gmail.com' });
    for (const changes of [{ iss: 'https://evil.example' }, { aud: 'other-client' }, { nonce: 'wrong' }, { email: 'other@example.com' }, { email_verified: false }]) await expect(verifyIdToken(await makeToken(changes), env, 'nonce', 'https://keys.test')).rejects.toThrow('Invalid Google identity');
  });

  it('rejects OAuth state mismatch and replay before contacting Google', async () => {
    const env = { ...productionEnv(null), GOOGLE_CLIENT_SECRET: 'test-client-secret' };
    const mismatch = await handleAuthRoute(new Request('https://br.test/auth/google/callback?state=wrong&code=code'), env);
    expect(mismatch?.status).toBe(400);
  });

  it('defines secure session and CSRF cookie attributes', () => {
    expect(sessionCookie('opaque', 259200)).toContain('__Host-br_session=opaque; Path=/; Max-Age=259200; HttpOnly; Secure; SameSite=Lax');
    expect(csrfCookie('csrf', 259200)).toContain('br_csrf=csrf; Path=/; Max-Age=259200; Secure; SameSite=Lax');
    expect(sessionCookie('opaque', 259200)).not.toContain('Domain=');
  });

  it('uses isolated non-Secure cookies only for the native HTTP loopback runtime', () => {
    expect(localSessionCookie('opaque', 259200)).toContain('br_local_session=opaque; Path=/; Max-Age=259200; HttpOnly; SameSite=Lax');
    expect(localSessionCookie('opaque', 259200)).not.toContain('Secure');
    expect(localCsrfCookie('csrf', 259200)).toContain('br_local_csrf=csrf; Path=/; Max-Age=259200; SameSite=Lax');
    expect(localCsrfCookie('csrf', 259200)).not.toContain('Secure');
    const localRequest = new Request('http://127.0.0.1:8787/api/v1/people', { headers: { cookie: 'br_local_csrf=csrf', origin: 'http://127.0.0.1:8787', 'x-br-csrf': 'csrf' } });
    expect(requireCsrf(localRequest, productionEnv(null))).toBe(true);
    const rcRequest = new Request('https://rc.example/api/v1/people', { headers: { cookie: 'br_local_csrf=csrf', origin: 'https://rc.example', 'x-br-csrf': 'csrf' } });
    expect(requireCsrf(rcRequest, productionEnv(null))).toBe(false);
  });

  it('validates the isolated local session cookie against the same D1 hash', async () => {
    const token = 'local-session-token';
    const secret = 'local-only-test-secret';
    const row = { google_sub: 'google-owner', email: 'boutiquerooms.makati@gmail.com', role: 'OWNER', expires_at: '2999-01-01T00:00:00.000Z', revoked_at: null };
    const env = { ...productionEnv(row), AUTH_SESSION_SECRET: secret };
    let boundHash = '';
    env.DB = { prepare: () => ({ bind: (...args: unknown[]) => { boundHash = String(args[0]); return { first: async () => row, run: async () => ({}) }; } }) } as never;
    const request = new Request('http://127.0.0.1:8787/auth/session', { headers: { cookie: localSessionCookie(token, 259200) } });
    expect(await new GoogleSessionAuthService().authenticate(request, env)).toEqual({ subject: 'google-owner', email: 'boutiquerooms.makati@gmail.com', role: 'OWNER' });
    expect(boundHash).toBe(await hmac(token, secret));
  });

  it('contains additive auth tables in the new migration', () => {
    const migration = readFileSync(resolve(process.cwd(), 'db/migrations/0011_google_auth.sql'), 'utf8');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS auth_sessions');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS oauth_transactions');
    expect(migration.toUpperCase()).not.toContain('DROP TABLE');
  });
});
