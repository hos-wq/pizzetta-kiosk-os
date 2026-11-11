import { ApiError, D1Repository, now } from './repository';
import { requireAuth, type AuthEnv } from './auth';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const DEFAULT_DRIVE_ROOT_ID = '1o2wH9KGIAu_1S_SbEuJPdfWhG8CFJHMS';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const CONNECTION_TTL = 10 * 60 * 1000;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const sensitivePurposes = new Set(['PERSON_ID_DOCUMENT', 'TENANCY_CONTRACT']);

export type DriveEnv = Omit<AuthEnv, 'DB'> & { DB?: D1Database; GOOGLE_PICKER_API_KEY?: string; GOOGLE_DRIVE_ROOT_FOLDER_ID?: string };
type DriveIdentity = { subject: string; email: string; role: 'OWNER' };

const base64Url = (bytes: Uint8Array) => { let value = ''; for (const byte of bytes) value += String.fromCharCode(byte); return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); };
const random = (size = 32) => { const bytes = new Uint8Array(size); crypto.getRandomValues(bytes); return base64Url(bytes); };
const fromBase64Url = (value: string) => { const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='); const binary = atob(normalized); return Uint8Array.from(binary, character => character.charCodeAt(0)); };
const hmac = async (value: string, secret: string) => { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))); };
const deriveKey = async (secret: string) => crypto.subtle.importKey('raw', new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
const encrypt = async (value: string, secret: string) => { const iv = crypto.getRandomValues(new Uint8Array(12)); const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await deriveKey(secret), new TextEncoder().encode(value))); return { ciphertext: base64Url(ciphertext), iv: base64Url(iv) }; };
const decrypt = async (ciphertext: string, iv: string, secret: string) => new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(iv) }, await deriveKey(secret), fromBase64Url(ciphertext)));
const redirectUri = (request: Request) => `${new URL(request.url).origin}/auth/google/drive/callback`;
const json = (data: unknown, status = 200) => Response.json({ data }, { status, headers: { 'cache-control': 'no-store' } });
const authFailure = () => json({ code: 'UNAUTHENTICATED', message: 'Authentication required' }, 401);
const configured = (env: DriveEnv): env is DriveEnv & { GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string; AUTH_SESSION_SECRET: string } => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.AUTH_SESSION_SECRET);

async function driveToken(repo: D1Repository, env: DriveEnv, identity: DriveIdentity) {
  if (!configured(env)) throw new ApiError(503, 'DRIVE_NOT_CONFIGURED', 'Drive authorization is not configured');
  const connection = await repo.first("SELECT * FROM drive_connections WHERE google_sub=? AND status='ACTIVE'", identity.subject) as Record<string, unknown> | null;
  if (!connection) throw new ApiError(409, 'DRIVE_NOT_CONNECTED', 'Google Drive is not connected');
  if (!String(connection.scopes ?? '').split(/\s+/).includes(DRIVE_SCOPE)) throw new ApiError(409, 'DRIVE_SCOPE_INVALID', 'Drive connection does not have the required drive.file scope');
  let refreshToken: string;
  try { refreshToken = await decrypt(String(connection.refresh_token_ciphertext), String(connection.refresh_token_iv), env.AUTH_SESSION_SECRET); } catch { throw new ApiError(503, 'DRIVE_CREDENTIAL_INVALID', 'Stored Drive authorization cannot be used'); }
  const response = await fetch(TOKEN_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' }) });
  if (!response.ok) { await repo.run("UPDATE drive_connections SET status='ERROR',updated_at=? WHERE id=?", now(), connection.id); throw new ApiError(503, 'DRIVE_AUTH_REVOKED', 'Google Drive authorization must be reconnected'); }
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new ApiError(503, 'DRIVE_TOKEN_INVALID', 'Google Drive did not return an access token');
  return { token: payload.access_token, connection };
}

const configuredRootId = (env: DriveEnv) => env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() || DEFAULT_DRIVE_ROOT_ID;
async function driveFetch(token: string, path: string, init?: RequestInit, rootFolderId = DEFAULT_DRIVE_ROOT_ID) {
  const rootMatch = path.match(/^\/files\/([^?]+)/);
  if (rootMatch && decodeURIComponent(rootMatch[1]) !== rootFolderId) throw new ApiError(422, 'DRIVE_ROOT_INVALID', 'Only the configured Boutique Rooms OS RC root folder may be selected');
  const headers = new Headers(init?.headers); headers.set('authorization', `Bearer ${token}`); return fetch(`${DRIVE_API}${path}`, { ...init, headers });
}

export async function handleDriveAuthRoute(request: Request, env: DriveEnv): Promise<Response | null> {
  const url = new URL(request.url); if (!url.pathname.startsWith('/auth/google/drive')) return null; const identity = await requireAuth(request, env); if (!identity) return authFailure(); if (!configured(env) || !env.DB) return json({ code: 'DRIVE_NOT_CONFIGURED', message: 'Drive authorization is not configured' }, 503); const repo = new D1Repository(env.DB);
  if (url.pathname === '/auth/google/drive' && request.method === 'GET') { const state = random(); const verifier = random(48); const challenge = base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))); const created = new Date(); await repo.run('INSERT INTO drive_oauth_transactions (state_hash,google_sub,code_verifier,redirect_uri,created_at,expires_at) VALUES (?,?,?,?,?,?)', await hmac(state, env.AUTH_SESSION_SECRET), identity.subject, verifier, redirectUri(request), created.toISOString(), new Date(created.getTime() + CONNECTION_TTL).toISOString()); const authorization = new URL(AUTH_ENDPOINT); authorization.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri(request), response_type: 'code', scope: DRIVE_SCOPE, state, code_challenge: challenge, code_challenge_method: 'S256', access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', login_hint: identity.email }).toString(); return Response.redirect(authorization.toString(), 302); }
  if (url.pathname === '/auth/google/drive/callback' && request.method === 'GET') { const state = url.searchParams.get('state'); const code = url.searchParams.get('code'); if (!state || !code || url.searchParams.get('error')) return json({ code: 'DRIVE_OAUTH_FAILED', message: 'Drive authorization was not completed' }, 400); const stateHash = await hmac(state, env.AUTH_SESSION_SECRET); const transaction = await repo.first('SELECT * FROM drive_oauth_transactions WHERE state_hash=? AND google_sub=? AND consumed_at IS NULL', stateHash, identity.subject) as Record<string, unknown> | null; if (!transaction || String(transaction.expires_at) <= now()) return json({ code: 'DRIVE_OAUTH_STATE_INVALID', message: 'Drive authorization state is invalid or expired' }, 400); await repo.run('UPDATE drive_oauth_transactions SET consumed_at=? WHERE state_hash=? AND consumed_at IS NULL', now(), stateHash); const tokenResponse = await fetch(TOKEN_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: String(transaction.redirect_uri), grant_type: 'authorization_code', code_verifier: String(transaction.code_verifier) }) }); if (!tokenResponse.ok) return json({ code: 'DRIVE_CODE_EXCHANGE_FAILED', message: 'Drive authorization failed' }, 401); const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; scope?: string }; if (!tokens.access_token || !tokens.refresh_token) return json({ code: 'DRIVE_REFRESH_TOKEN_MISSING', message: 'Google did not return offline Drive authorization; reconnect with consent' }, 401); const encrypted = await encrypt(tokens.refresh_token, env.AUTH_SESSION_SECRET); const timestamp = now(); await repo.run("INSERT INTO drive_connections (id,google_sub,email,refresh_token_ciphertext,refresh_token_iv,scopes,status,created_at,updated_at) VALUES (?,?,?,?,?,?, 'ACTIVE',?,?) ON CONFLICT(google_sub) DO UPDATE SET email=excluded.email,refresh_token_ciphertext=excluded.refresh_token_ciphertext,refresh_token_iv=excluded.refresh_token_iv,scopes=excluded.scopes,status='ACTIVE',revoked_at=NULL,updated_at=excluded.updated_at", crypto.randomUUID(), identity.subject, identity.email, encrypted.ciphertext, encrypted.iv, tokens.scope ?? DRIVE_SCOPE, timestamp, timestamp); await repo.audit('CONNECT', 'drive_connection', identity.subject, { provider: 'GOOGLE_DRIVE', scope: DRIVE_SCOPE }); const headers = new Headers({ location: '/v2/office/documents?drive=connected', 'cache-control': 'no-store' }); return new Response(null, { status: 302, headers }); }
  return json({ code: 'NOT_FOUND', message: 'Drive auth route not found' }, 404);
}

export async function driveStatus(repo: D1Repository, identity: DriveIdentity) { const connection = await repo.first("SELECT google_sub,email,root_folder_id,root_folder_name,scopes,status,created_at,updated_at,revoked_at FROM drive_connections WHERE google_sub=?", identity.subject); return connection ? { connected: connection.status === 'ACTIVE', ...connection } : { connected: false, root_folder_id: null, root_folder_name: null }; }
export async function drivePickerConfig(repo: D1Repository, identity: DriveIdentity, env: DriveEnv) { const status = await driveStatus(repo, identity); if (!status.connected) return { ...status, picker_api_key: env.GOOGLE_PICKER_API_KEY ?? null }; return { ...status, picker_api_key: env.GOOGLE_PICKER_API_KEY ?? null }; }
export async function drivePickerToken(repo: D1Repository, env: DriveEnv, identity: DriveIdentity) { const result = await driveToken(repo, env, identity); return { access_token: result.token, expires_in: 3600 }; }

export async function selectDriveRoot(repo: D1Repository, env: DriveEnv, identity: DriveIdentity, folderId: string) { const { token, connection } = await driveToken(repo, env, identity); const response = await driveFetch(token, `/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,trashed&supportsAllDrives=false`, undefined, configuredRootId(env)); if (!response.ok) throw new ApiError(422, 'DRIVE_FOLDER_NOT_ACCESSIBLE', 'Select the configured Boutique Rooms OS RC folder in Google Picker first'); const folder = await response.json() as { id?: string; name?: string; mimeType?: string; trashed?: boolean }; if (folder.mimeType !== 'application/vnd.google-apps.folder' || folder.trashed) throw new ApiError(422, 'DRIVE_FOLDER_INVALID', 'The selected Drive item is not an active folder'); await repo.run("UPDATE drive_connections SET root_folder_id=?,root_folder_name=?,updated_at=? WHERE id=?", folder.id, folder.name ?? null, now(), connection.id); await repo.audit('ROOT_SELECTED', 'drive_connection', identity.subject, { root_folder_id: folder.id }); return { root_folder_id: folder.id, root_folder_name: folder.name }; }

export async function createDriveDocument(repo: D1Repository, env: DriveEnv, identity: DriveIdentity, input: { entity_type: string; entity_id: string; purpose: string; file: File; upload_attempt_id?: string }) {
  if (!sensitivePurposes.has(input.purpose)) throw new ApiError(422, 'DRIVE_PURPOSE_INVALID', 'Drive is reserved for sensitive identity and contract documents');
  if (input.file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, 'FILE_TOO_LARGE', 'Document exceeds the 15 MB limit');
  const ownerTables: Record<string, string> = { PERSON: 'persons', TENANCY: 'tenancies' };
  const table = ownerTables[input.entity_type];
  if (!table || !await repo.first(`SELECT id FROM ${table} WHERE id=?`, input.entity_id)) throw new ApiError(404, 'NOT_FOUND', 'Document owner not found');
  const { token, connection } = await driveToken(repo, env, identity);
  if (!connection.root_folder_id) throw new ApiError(409, 'DRIVE_ROOT_NOT_SELECTED', 'Select the Boutique Rooms OS Drive folder before uploading');
  const metadata = { name: input.file.name.replace(/[\\/]/g, '_').slice(0, 180), parents: [String(connection.root_folder_id)], mimeType: input.file.type || 'application/octet-stream', appProperties: { br_entity_type: input.entity_type, br_entity_id: input.entity_id, br_purpose: input.purpose } };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', input.file, metadata.name);
  const upload = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,parents', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form });
  if (!upload.ok) throw new ApiError(502, 'DRIVE_UPLOAD_FAILED', 'Google Drive rejected the document upload');
  const file = await upload.json() as { id?: string; name?: string; mimeType?: string; size?: string; webViewLink?: string; parents?: string[] };
  if (!file.id) throw new ApiError(502, 'DRIVE_FILE_INVALID', 'Google Drive returned an invalid document reference');
  const referenceUrl = file.webViewLink ?? `https://drive.google.com/open?id=${file.id}`;
  if (input.upload_attempt_id) await repo.run("UPDATE drive_upload_attempts SET status='UPLOADED',external_file_id=?,external_name=?,external_mime_type=?,external_size=?,external_parent_id=?,external_reference_url=?,updated_at=? WHERE id=? AND status='PENDING'", file.id, file.name ?? metadata.name, file.mimeType ?? input.file.type, file.size ? Number(file.size) : input.file.size, file.parents?.[0] ?? connection.root_folder_id, referenceUrl, now(), input.upload_attempt_id);
  const mediaId = crypto.randomUUID(); const timestamp = now();
  await repo.run('INSERT INTO media_records (id,reference_url,mime_type,byte_size,purpose,access_class,entity_type,entity_id,status,uploaded_by,created_at,updated_at,provider,external_provider,external_file_id,external_parent_id,transformation_preset) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', mediaId, referenceUrl, file.mimeType ?? input.file.type, file.size ? Number(file.size) : input.file.size, input.purpose, 'SENSITIVE', input.entity_type, input.entity_id, 'ACTIVE', identity.subject, timestamp, timestamp, 'EXTERNAL', 'GOOGLE_DRIVE', file.id, file.parents?.[0] ?? connection.root_folder_id, null);
  await repo.audit('UPLOAD', 'media_record', mediaId, { provider: 'GOOGLE_DRIVE', external_file_id: file.id, entity_type: input.entity_type, entity_id: input.entity_id, purpose: input.purpose });
  return { id: mediaId, external_file_id: file.id, name: file.name, mime_type: file.mimeType, reference_url: file.webViewLink ?? null, purpose: input.purpose, entity_type: input.entity_type, entity_id: input.entity_id };
}
export async function revokeDriveConnection(repo: D1Repository, identity: DriveIdentity, env: DriveEnv) { const connection = await repo.first('SELECT id,refresh_token_ciphertext,refresh_token_iv FROM drive_connections WHERE google_sub=?', identity.subject) as Record<string, unknown> | null; if (!connection) return { revoked: false }; if (configured(env)) { try { const refreshToken = await decrypt(String(connection.refresh_token_ciphertext), String(connection.refresh_token_iv), env.AUTH_SESSION_SECRET); await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: 'POST' }); } catch { /* local revocation still proceeds */ } } await repo.run("UPDATE drive_connections SET status='REVOKED',revoked_at=?,updated_at=? WHERE id=?", now(), now(), connection.id); await repo.audit('REVOKE', 'drive_connection', identity.subject, { provider: 'GOOGLE_DRIVE' }); return { revoked: true }; }
