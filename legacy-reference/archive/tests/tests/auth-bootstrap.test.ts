import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkOwnerSession, clearAuthCallbackSearch, isAuthCallbackSearch } from '../apps/web/src/v2/auth-bootstrap';
import { handleAuthRoute } from '../apps/worker/src/auth';

const response = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status, headers: { 'content-type': 'application/json' } });
const owner = { subject: 'google-owner', role: 'OWNER', email: 'boutiquerooms.makati@gmail.com' };
describe('V2 server-confirmed authentication bootstrap', () => {
  it('keeps callback bootstrap neutral and removes only its internal marker after success', () => {
    expect(isAuthCallbackSearch('?__br_auth=callback&tab=rooms')).toBe(true);
    expect(isAuthCallbackSearch('?__br_auth=other')).toBe(false);
    expect(clearAuthCallbackSearch('/v2/office/rooms', '?__br_auth=callback&tab=rooms')).toBe('/v2/office/rooms?tab=rooms');
  });
  it('routes RC auth navigations to the Worker before SPA asset fallback', () => {
    const config = readFileSync(resolve(process.cwd(), 'wrangler.rc.toml'), 'utf8');
    expect(config).toContain('run_worker_first = ["/auth/*", "/api/*", "/webhook", "/v2/*"]');
    expect(config).toContain('name = "boutique-rooms-os-rc"');
    expect(config).not.toContain('b156b6f1-3871-4113-8f46-476c1f97c02d');
  });
  it('denies anonymous, malformed and truthy non-boolean responses', async () => {
    for (const data of [{ authenticated: false }, {}, { authenticated: 'false', user: owner }, { authenticated: true }]) {
      expect(await checkOwnerSession(vi.fn().mockResolvedValue(response(data)))).toBe(false);
    }
  });
  it('admits only the server-confirmed owner', async () => {
    expect(await checkOwnerSession(vi.fn().mockResolvedValue(response({ authenticated: true, user: owner })))).toBe(true);
    for (const user of [{ ...owner, role: 'ADMIN' }, { ...owner, email: 'other@example.com' }, { subject: 'dev-owner' }]) {
      expect(await checkOwnerSession(vi.fn().mockResolvedValue(response({ authenticated: true, user })))).toBe(false);
    }
  });
  it('uses uncached same-origin session requests and never sends production DevAuth', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ authenticated: false }));
    await checkOwnerSession(fetcher);
    expect(fetcher).toHaveBeenCalledWith('/auth/session', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
  });
  it('keeps local development dependent on server confirmation', async () => {
    expect(await checkOwnerSession(vi.fn().mockResolvedValue(response({ authenticated: false })), true)).toBe(false);
    expect(await checkOwnerSession(vi.fn().mockResolvedValue(response({ authenticated: true, user: { subject: 'dev-owner' } })), true)).toBe(true);
  });
  it('denies expired/revoked responses and fails closed on unavailable or HTML session responses', async () => {
    expect(await checkOwnerSession(vi.fn().mockResolvedValue(response({}, 401)))).toBe(false);
    for (const result of [response({}, 503), new Response('<html>SPA</html>', { headers: { 'content-type': 'text/html' } })]) {
      await expect(checkOwnerSession(vi.fn().mockResolvedValue(result))).rejects.toThrow();
    }
    await expect(checkOwnerSession(vi.fn().mockRejectedValue(new Error('Offline')))).rejects.toThrow();
  });
  it('never caches the server session decision', async () => {
    const result = await handleAuthRoute(new Request('https://rc.test/auth/session'), { ENVIRONMENT: 'production' });
    expect(result?.headers.get('cache-control')).toBe('no-store');
    expect(await result?.json()).toEqual({ data: { authenticated: false } });
  });
});
