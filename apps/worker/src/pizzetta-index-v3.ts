import baseWorker from './pizzetta-index-v2'
import { authRoute, passwordAuthRoute, staffSession } from './pizzetta-auth'
import { orderRequestSchema } from '../../../packages/contracts/src/index'
import { chooseBranch, type AssignmentCandidate } from './pizzetta-assignment'

type Env = { DB: D1Database; ASSETS: Fetcher; ENVIRONMENT?: string; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string; META_APP_ID?: string; META_APP_SECRET?: string; META_GRAPH_VERSION?: string; PUBLIC_ORIGIN?: string; AUTH_SESSION_SECRET?: string }

const customerCookie = (request: Request) => request.headers.get('cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith('pizzetta_session='))?.slice('pizzetta_session='.length) ?? null
const digestValue = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(byte => byte.toString(16).padStart(2, '0')).join('')
async function authenticatedCustomerId(request: Request, env: Env) { const session = customerCookie(request); if (!session) return null; const auth = await env.DB.prepare("SELECT subject_id FROM auth_sessions WHERE token_hash=? AND subject_type='CUSTOMER' AND revoked_at IS NULL AND expires_at>?").bind(await digestValue(session), new Date().toISOString()).first<{ subject_id: string }>(); return auth?.subject_id ?? null }
async function customerLoyaltyRoute(request: Request, env: Env, path: string) { if (path !== '/api/customer/loyalty' || request.method !== 'GET') return null; const session = customerCookie(request); if (!session) return new Response(JSON.stringify({ error: { code: 'CUSTOMER_AUTH_REQUIRED', message: 'Customer sign-in required.' } }), { status: 401, headers: { 'content-type': 'application/json' } }); const auth = await env.DB.prepare('SELECT subject_id FROM auth_sessions WHERE token_hash=? AND subject_type=\'CUSTOMER\' AND revoked_at IS NULL AND expires_at>?').bind(await digestValue(session), new Date().toISOString()).first<{ subject_id: string }>(); if (!auth) return new Response(JSON.stringify({ error: { code: 'CUSTOMER_AUTH_REQUIRED', message: 'Customer sign-in required.' } }), { status: 401, headers: { 'content-type': 'application/json' } }); const loyalty = await env.DB.prepare('SELECT points_balance,lifetime_points,rewards_available,tier FROM loyalty_accounts WHERE customer_id=?').bind(auth.subject_id).first(); const rewards = await env.DB.prepare("SELECT reward_code,milestone,status,created_at FROM loyalty_rewards WHERE loyalty_account_id=(SELECT id FROM loyalty_accounts WHERE customer_id=?) ORDER BY milestone").bind(auth.subject_id).all(); return new Response(JSON.stringify({ data: { ...(loyalty ?? { points_balance: 0, lifetime_points: 0, rewards_available: 0, tier: 'starter' }), rewards: rewards.results } }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }) }

async function validateOrderPayload(request: Request): Promise<Request | Response> {
  const path = new URL(request.url).pathname
  if (request.method !== 'POST' || (path !== '/api/orders' && path !== '/api/order-requests')) return request
  let payload: unknown
  try { payload = await request.json() } catch { return new Response(JSON.stringify({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } }) }
  const parsed = orderRequestSchema.safeParse(payload)
  if (!parsed.success) return new Response(JSON.stringify({ error: { code: 'INVALID_ORDER_REQUEST', message: 'Order payload failed validation.', issues: parsed.error.issues } }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } })
  const headers = new Headers(request.headers)
  headers.delete('content-length')
  return new Request(request, { headers, body: JSON.stringify(parsed.data) })
}

async function assignOrderBranch(request: Request, env: Env): Promise<Request | Response> {
  const path = new URL(request.url).pathname
  if (request.method !== 'POST' || (path !== '/api/orders' && path !== '/api/order-requests')) return request
  const payload = await request.json() as Record<string, unknown>
  const rows = await env.DB.prepare(`SELECT b.id,b.name,b.latitude,b.longitude,COALESCE(bo.wait_minutes,0) AS wait_minutes,COALESCE(bo.orders_paused,0) AS orders_paused FROM branches b LEFT JOIN branch_operations bo ON bo.branch_id=b.id WHERE b.is_active=1`).all<AssignmentCandidate>()
  let selected: ReturnType<typeof chooseBranch>
  try { selected = chooseBranch({ latitude: typeof payload.latitude === 'number' ? payload.latitude : undefined, longitude: typeof payload.longitude === 'number' ? payload.longitude : undefined, requestedBranchId: typeof payload.branchId === 'string' ? payload.branchId : undefined }, rows.results) } catch (error) { return new Response(JSON.stringify({ error: { code: 'NO_BRANCH_AVAILABLE', message: error instanceof Error ? error.message : 'No branch is available.' } }), { status: 409, headers: { 'content-type': 'application/json; charset=utf-8' } }) }
  payload.branchId = selected.id
  const headers = new Headers(request.headers)
  headers.delete('content-length')
  return new Request(request, { headers, body: JSON.stringify(payload) })
}

async function appShell(request: Request, env: Env, manifest: '/manifest-client.webmanifest' | '/manifest-restaurant.webmanifest') {
  const response = await env.ASSETS.fetch(new Request(new URL('/', request.url), request))
  const html = await response.text()
  const patched = html.replace('/manifest-client.webmanifest', manifest)
  const headers = new Headers(response.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'no-store')
  return new Response(patched, { status: 200, headers })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname.replace(/\/$/, '')
    if (request.method === 'GET' && path === '/client') return appShell(request, env, '/manifest-client.webmanifest')
    if (request.method === 'GET' && (path === '/restaurant' || path === '/staff')) return appShell(request, env, '/manifest-restaurant.webmanifest')
    if (request.method === 'GET' && path === '/privacy') return env.ASSETS.fetch(new Request(new URL('/privacy.html', request.url), request))
    if (request.method === 'GET' && path === '/data-deletion') return env.ASSETS.fetch(new Request(new URL('/data-deletion.html', request.url), request))
    const passwordAuth = await passwordAuthRoute(request, env, path)
    if (passwordAuth) return passwordAuth
    const loyalty = await customerLoyaltyRoute(request, env, path)
    if (loyalty) return loyalty
    const validatedPayload = await validateOrderPayload(request)
    if (validatedPayload instanceof Response) return validatedPayload
    const assignedRequest = await assignOrderBranch(validatedPayload, env)
    if (assignedRequest instanceof Response) return assignedRequest
    request = assignedRequest
    if (request.method === 'POST' && path === '/api/order-requests') { const customerId = await authenticatedCustomerId(request, env); if (customerId) { const payload = await request.json() as Record<string, unknown>; payload.customerId = customerId; const headers = new Headers(request.headers); headers.delete('content-length'); request = new Request(request, { headers, body: JSON.stringify(payload) }) } }
    const auth = await authRoute(request, env, path)
    if (auth) return auth
    const session = await staffSession(request, env)
    if (session) {
      const headers = new Headers(request.headers)
      headers.set('x-pizzetta-staff-role', String(session.role))
      headers.set('x-pizzetta-staff-id', String(session.subject_id))
      if (env.AUTH_SESSION_SECRET) headers.set('x-pizzetta-staff-proof', env.AUTH_SESSION_SECRET)
      if (session.branch_id) headers.set('x-pizzetta-branch-id', String(session.branch_id))
      return baseWorker.fetch(new Request(request, { headers }), env)
    }
    return baseWorker.fetch(request, env)
  },
}
