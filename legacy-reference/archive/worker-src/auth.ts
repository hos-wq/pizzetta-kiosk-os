const DEFAULT_AUTHORIZED_EMAIL = 'otherbadhabits.makati@gmail.com';
const SESSION_COOKIE = '__Host-br_session';
const CSRF_COOKIE = 'br_csrf';
const LOCAL_SESSION_COOKIE = 'br_local_session';
const LOCAL_CSRF_COOKIE = 'br_local_csrf';
const SESSION_MAX_AGE = 72 * 60 * 60;
const OAUTH_TRANSACTION_TTL = 10 * 60 * 1000;
const GOOGLE_DISCOVERY = 'https://accounts.google.com/.well-known/openid-configuration';
const DEFAULT_RETURN_PATH = '/v2/mobile/attention';
const AUTH_CALLBACK_PARAM = '__br_auth';

type Db = { prepare(sql: string): { bind(...args: unknown[]): { first<T = Record<string, unknown>>(): Promise<T | null>; run(): Promise<unknown> } } };
export type AuthEnv = { DB?: Db; ENVIRONMENT?: string; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string; AUTH_SESSION_SECRET?: string; PIZZETTA_OWNER_EMAIL?: string };
export type AuthIdentity = { subject: string; email: string; role: 'OWNER' };
export interface AuthService { authenticate(request: Request, env: AuthEnv): Promise<AuthIdentity | null> }

const json = (data: unknown, status = 200, headers?: Headers) => { const responseHeaders = headers ?? new Headers(); responseHeaders.set('content-type', 'application/json; charset=utf-8'); responseHeaders.set('cache-control', 'no-store'); return new Response(JSON.stringify({ data }), { status, headers: responseHeaders }); };
const bytesToBase64Url = (bytes: Uint8Array) => { let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); };
const base64UrlToBytes = (value: string) => { const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='); const binary = atob(normalized); return Uint8Array.from(binary, character => character.charCodeAt(0)); };
const randomToken = (size = 32) => { const bytes = new Uint8Array(size); crypto.getRandomValues(bytes); return bytesToBase64Url(bytes); };
const encodeText = (value: string) => bytesToBase64Url(new TextEncoder().encode(value));
const decodeText = (value: string) => new TextDecoder().decode(base64UrlToBytes(value));
export const sha256 = async (value: string) => bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
const secretHash = async (value: string, secret: string) => { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))); };
const timingSafeEqual = (left: string, right: string) => { if (left.length !== right.length) return false; let result = 0; for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index); return result === 0; };
const parseCookies = (request: Request) => Object.fromEntries((request.headers.get('cookie') ?? '').split(';').map(part => part.trim()).filter(Boolean).map(part => { const separator = part.indexOf('='); return separator < 0 ? [part, ''] : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))]; }));
const sessionCookie = (value: string, maxAge: number) => `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
const csrfCookie = (value: string, maxAge: number) => `${CSRF_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; Secure; SameSite=Lax`;
const isLocalHttp = (request: Request) => { const url = new URL(request.url); return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname); };
const sessionCookieName = (request: Request) => isLocalHttp(request) ? LOCAL_SESSION_COOKIE : SESSION_COOKIE;
const csrfCookieName = (request: Request) => isLocalHttp(request) ? LOCAL_CSRF_COOKIE : CSRF_COOKIE;
const localSessionCookie = (value: string, maxAge: number) => `${LOCAL_SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
const localCsrfCookie = (value: string, maxAge: number) => `${LOCAL_CSRF_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
const appendAuthCookies = (headers: Headers, request: Request, sessionToken: string, csrf: string) => { if (isLocalHttp(request)) { headers.append('set-cookie', localSessionCookie(sessionToken, SESSION_MAX_AGE)); headers.append('set-cookie', localCsrfCookie(csrf, SESSION_MAX_AGE)); } else { headers.append('set-cookie', sessionCookie(sessionToken, SESSION_MAX_AGE)); headers.append('set-cookie', csrfCookie(csrf, SESSION_MAX_AGE)); } };
const clearCookie = (name: string, httpOnly = true, secure = true) => `${name}=; Path=/; Max-Age=0; ${httpOnly ? 'HttpOnly; ' : ''}${secure ? 'Secure; ' : ''}SameSite=Lax`;

export class DevAuthService implements AuthService {
  async authenticate(request: Request, env: AuthEnv): Promise<AuthIdentity | null> { if (env.ENVIRONMENT === 'production') return null; const token = request.headers.get('authorization'); return token === 'Dev owner' || request.headers.get('x-dev-auth') === 'owner' ? { subject: 'dev-owner' } as AuthIdentity : null; }
}

export class GoogleSessionAuthService implements AuthService {
  async authenticate(request: Request, env: AuthEnv): Promise<AuthIdentity | null> {
    if (env.ENVIRONMENT !== 'production' || !env.AUTH_SESSION_SECRET) return null;
    const token = parseCookies(request)[sessionCookieName(request)]; if (!token) return null;
    if (!env.DB) return null;
    const session = await env.DB.prepare('SELECT google_sub,email,role,expires_at,revoked_at FROM auth_sessions WHERE session_hash=?').bind(await secretHash(token, env.AUTH_SESSION_SECRET)).first<Record<string, unknown>>();
    if (!session || session.revoked_at || String(session.expires_at) <= new Date().toISOString() || session.role !== 'OWNER' || String(session.email).toLowerCase() !== (env.PIZZETTA_OWNER_EMAIL ?? DEFAULT_AUTHORIZED_EMAIL).toLowerCase()) return null;
    return { subject: String(session.google_sub), email: String(session.email), role: 'OWNER' };
  }
}

export const requireAuth = async (request: Request, env: AuthEnv) => (env.ENVIRONMENT === 'production' ? new GoogleSessionAuthService() : new DevAuthService()).authenticate(request, env);
const sameOrigin = (request: Request) => { const origin = request.headers.get('origin'); return !origin || origin === new URL(request.url).origin; };
export const requireCsrf = (request: Request, env: AuthEnv) => { if (env.ENVIRONMENT !== 'production') return true; const cookies = parseCookies(request); const csrf = cookies[csrfCookieName(request)]; return sameOrigin(request) && Boolean(csrf) && timingSafeEqual(csrf, request.headers.get('x-br-csrf') ?? ''); };
const authConfig = (env: AuthEnv) => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.AUTH_SESSION_SECRET);
const configurationError = () => json({ code: 'AUTH_NOT_CONFIGURED', message: 'Google authentication is not configured' }, 503);
const googleDiscovery = async () => { const response = await fetch(GOOGLE_DISCOVERY); if (!response.ok) throw new Error('Google discovery unavailable'); return await response.json() as { authorization_endpoint: string; token_endpoint: string; jwks_uri: string }; };
export const safeReturnPath = (candidate: string | null | undefined) => {
  if (!candidate || candidate.includes('\\') || /[\u0000-\u001f#]/.test(candidate)) return DEFAULT_RETURN_PATH;
  try {
    const target = new URL(candidate, 'https://br-os.invalid');
    if (target.origin !== 'https://br-os.invalid' || (target.pathname !== '/v2/office' && !target.pathname.startsWith('/v2/office/')) && (target.pathname !== '/v2/mobile' && !target.pathname.startsWith('/v2/mobile/'))) return DEFAULT_RETURN_PATH;
    return `${target.pathname}${target.search}`;
  } catch { return DEFAULT_RETURN_PATH; }
};
const oauthState = (returnPath: string) => `${randomToken()}.${encodeText(returnPath)}`;
const returnPathFromState = (state: string) => { try { const encoded = state.slice(state.indexOf('.') + 1); const target = new URL(safeReturnPath(decodeText(encoded)), 'https://br-os.invalid'); target.searchParams.set(AUTH_CALLBACK_PARAM, 'callback'); return `${target.pathname}${target.search}`; } catch { return `${DEFAULT_RETURN_PATH}?${AUTH_CALLBACK_PARAM}=callback`; } };

export const verifyIdToken = async (idToken: string, env: AuthEnv, expectedNonce: string, jwksUri: string) => {
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split('.'); if (!encodedHeader || !encodedPayload || !encodedSignature) throw new Error('Malformed ID token');
  const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedHeader))) as { alg?: string; kid?: string }; const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as Record<string, unknown>;
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported ID token'); const keysResponse = await fetch(jwksUri); if (!keysResponse.ok) throw new Error('Google signing keys unavailable'); const keys = await keysResponse.json() as { keys?: (JsonWebKey & { kid?: string })[] }; const jwk = keys.keys?.find(key => key.kid === header.kid); if (!jwk) throw new Error('Unknown Google signing key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']); const valid = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, base64UrlToBytes(encodedSignature), new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)); const nowSeconds = Math.floor(Date.now() / 1000);
  if (!valid || !['https://accounts.google.com', 'accounts.google.com'].includes(String(payload.iss)) || payload.aud !== env.GOOGLE_CLIENT_ID || String(payload.nonce) !== expectedNonce || payload.email_verified !== true || String(payload.email).toLowerCase() !== (env.PIZZETTA_OWNER_EMAIL ?? DEFAULT_AUTHORIZED_EMAIL).toLowerCase() || Number(payload.exp) <= nowSeconds || Number(payload.iat) > nowSeconds + 60) throw new Error('Invalid Google identity');
  return { sub: String(payload.sub), email: String(payload.email) };
};

const redirectUri = (request: Request) => `${new URL(request.url).origin}/auth/google/callback`;
export const handleAuthRoute = async (request: Request, env: AuthEnv): Promise<Response | null> => {
  const url = new URL(request.url); if (!url.pathname.startsWith('/auth/')) return null;
  if (url.pathname === '/auth/session' && request.method === 'GET') { const identity = await requireAuth(request, env); return json(identity ? { authenticated: true, user: identity } : { authenticated: false }); }
  if (url.pathname === '/auth/google' && request.method === 'GET') {
    if (!authConfig(env) || !env.DB) return configurationError(); const discovery = await googleDiscovery(); const state = oauthState(safeReturnPath(url.searchParams.get('return_to'))); const nonce = randomToken(); const verifier = randomToken(48); const challenge = bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))); const createdAt = new Date();
    await env.DB.prepare('INSERT INTO oauth_transactions (state_hash,nonce,code_verifier,redirect_uri,created_at,expires_at) VALUES (?,?,?,?,?,?)').bind(await secretHash(state, env.AUTH_SESSION_SECRET!), nonce, verifier, redirectUri(request), createdAt.toISOString(), new Date(createdAt.getTime() + OAUTH_TRANSACTION_TTL).toISOString()).run();
    const authorization = new URL(discovery.authorization_endpoint); authorization.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(request), response_type: 'code', scope: 'openid email profile', state, nonce, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account', access_type: 'online' }).toString(); return Response.redirect(authorization.toString(), 302);
  }
  if (url.pathname === '/auth/google/callback' && request.method === 'GET') {
    if (!authConfig(env) || !env.DB) return configurationError(); const state = url.searchParams.get('state'); const code = url.searchParams.get('code'); if (!state || !code || url.searchParams.get('error')) return json({ code: 'OAUTH_CALLBACK_FAILED', message: 'Google authentication was not completed' }, 400);
    const stateHash = await secretHash(state, env.AUTH_SESSION_SECRET!); const transaction = await env.DB.prepare('SELECT * FROM oauth_transactions WHERE state_hash=? AND consumed_at IS NULL').bind(stateHash).first<Record<string, unknown>>(); if (!transaction || String(transaction.expires_at) <= new Date().toISOString()) return json({ code: 'OAUTH_STATE_INVALID', message: 'OAuth state is invalid or expired' }, 400); await env.DB.prepare('UPDATE oauth_transactions SET consumed_at=? WHERE state_hash=? AND consumed_at IS NULL').bind(new Date().toISOString(), stateHash).run();
    try { const discovery = await googleDiscovery(); const tokenResponse = await fetch(discovery.token_endpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, redirect_uri: String(transaction.redirect_uri), grant_type: 'authorization_code', code_verifier: String(transaction.code_verifier) }) }); if (!tokenResponse.ok) return json({ code: 'OAUTH_CODE_EXCHANGE_FAILED', message: 'Google authentication failed' }, 401); const tokenPayload = await tokenResponse.json() as { id_token?: string }; if (!tokenPayload.id_token) return json({ code: 'OAUTH_ID_TOKEN_MISSING', message: 'Google authentication failed' }, 401); const google = await verifyIdToken(tokenPayload.id_token, env, String(transaction.nonce), discovery.jwks_uri); const sessionToken = randomToken(); const csrf = randomToken(); const timestamp = new Date(); await env.DB.prepare('INSERT INTO auth_sessions (session_hash,google_sub,email,role,created_at,expires_at) VALUES (?,?,?,?,?,?)').bind(await secretHash(sessionToken, env.AUTH_SESSION_SECRET!), google.sub, google.email, 'OWNER', timestamp.toISOString(), new Date(timestamp.getTime() + SESSION_MAX_AGE * 1000).toISOString()).run(); const headers = new Headers({ location: returnPathFromState(state), 'cache-control': 'no-store' }); appendAuthCookies(headers, request, sessionToken, csrf); return new Response(null, { status: 302, headers }); } catch { return json({ code: 'OAUTH_CALLBACK_FAILED', message: 'Google authentication failed' }, 401); }
  }
  if (url.pathname === '/auth/logout' && request.method === 'POST') { if (!requireCsrf(request, env)) return json({ code: 'CSRF_INVALID', message: 'Invalid CSRF token' }, 403); const cookies = parseCookies(request); const local = isLocalHttp(request); const token = cookies[sessionCookieName(request)]; if (token && env.DB && env.AUTH_SESSION_SECRET) await env.DB.prepare('UPDATE auth_sessions SET revoked_at=? WHERE session_hash=? AND revoked_at IS NULL').bind(new Date().toISOString(), await secretHash(token, env.AUTH_SESSION_SECRET)).run(); const headers = new Headers({ 'cache-control': 'no-store' }); headers.append('set-cookie', clearCookie(local ? LOCAL_SESSION_COOKIE : SESSION_COOKIE, true, !local)); headers.append('set-cookie', clearCookie(local ? LOCAL_CSRF_COOKIE : CSRF_COOKIE, false, !local)); return json({ logged_out: true }, 200, headers); }
  return json({ code: 'NOT_FOUND', message: 'Auth route not found' }, 404);
};

export { DEFAULT_AUTHORIZED_EMAIL, SESSION_COOKIE, CSRF_COOKIE, LOCAL_SESSION_COOKIE, LOCAL_CSRF_COOKIE, sessionCookie, csrfCookie, localSessionCookie, localCsrfCookie };
