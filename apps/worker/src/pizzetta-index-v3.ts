import baseWorker from './pizzetta-index-v2'
import { authRoute, passwordAuthRoute, staffSession } from './pizzetta-auth'

type Env = { DB: D1Database; ASSETS: Fetcher; ENVIRONMENT?: string; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string; META_APP_ID?: string; META_APP_SECRET?: string; META_GRAPH_VERSION?: string; PUBLIC_ORIGIN?: string; AUTH_SESSION_SECRET?: string }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname.replace(/\/$/, '')
    if (request.method === 'GET' && path === '/privacy') return env.ASSETS.fetch(new Request(new URL('/privacy.html', request.url), request))
    if (request.method === 'GET' && path === '/data-deletion') return env.ASSETS.fetch(new Request(new URL('/data-deletion.html', request.url), request))
    const passwordAuth = await passwordAuthRoute(request, env, path)
    if (passwordAuth) return passwordAuth
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
