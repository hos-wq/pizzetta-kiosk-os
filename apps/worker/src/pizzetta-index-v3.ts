import baseWorker from './pizzetta-index-v2'
import { authRoute, passwordAuthRoute, staffSession } from './pizzetta-auth'

type Env = { DB: D1Database; ASSETS: Fetcher; PAYMENT_PROOFS?: R2Bucket; ENVIRONMENT?: string; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string; META_APP_ID?: string; META_APP_SECRET?: string; META_GRAPH_VERSION?: string; PUBLIC_ORIGIN?: string; AUTH_SESSION_SECRET?: string }

async function paymentProofRoute(request: Request, env: Env, path: string) {
  const match = path.match(/^\/api\/orders\/([^/]+)\/payment-proof$/)
  if (!match || request.method !== 'POST') return null
  if (!env.PAYMENT_PROOFS) return new Response(JSON.stringify({ error: { code: 'STORAGE_NOT_CONFIGURED', message: 'Payment proof storage is not configured.' } }), { status: 503, headers: { 'content-type': 'application/json' } })
  const accessToken = request.headers.get('x-order-access-token')
  const order = await env.DB.prepare('SELECT id FROM orders WHERE (id=? OR order_number=?) AND access_token_hash=?').bind(decodeURIComponent(match[1]), decodeURIComponent(match[1]), await crypto.subtle.digest('SHA-256', new TextEncoder().encode(accessToken ?? '')).then(bytes => Array.from(new Uint8Array(bytes)).map(value => value.toString(16).padStart(2, '0')).join(''))).first<{ id: string }>()
  if (!order) return new Response(JSON.stringify({ error: { code: 'ORDER_ACCESS_DENIED', message: 'Order access denied.' } }), { status: 403, headers: { 'content-type': 'application/json' } })
  const form = await request.formData(); const file = form.get('file'); const reference = String(form.get('reference') ?? '').trim(); if (!(file instanceof File) || !file.type.startsWith('image/') || file.size < 1 || file.size > 5 * 1024 * 1024) return new Response(JSON.stringify({ error: { code: 'INVALID_PAYMENT_PROOF', message: 'Upload an image up to 5 MB.' } }), { status: 400, headers: { 'content-type': 'application/json' } })
  const objectKey = `payment-proofs/${order.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`; await env.PAYMENT_PROOFS.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } }); await env.DB.prepare(`INSERT INTO payment_proofs (id,order_id,object_key,mime_type,byte_size,reference,status) VALUES (?,?,?,?,?,?, 'SUBMITTED')`).bind(crypto.randomUUID(), order.id, objectKey, file.type, file.size, reference || null).run(); return new Response(JSON.stringify({ data: { order_id: order.id, status: 'SUBMITTED' } }), { status: 201, headers: { 'content-type': 'application/json' } })
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
    const paymentProof = await paymentProofRoute(request, env, path)
    if (paymentProof) return paymentProof
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
