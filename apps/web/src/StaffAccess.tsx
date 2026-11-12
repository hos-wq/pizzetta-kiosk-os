import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import StaffConsole from './StaffConsole'
import './PizzettaWorld.css'
import './StaffAccess.css'
import { enablePizzettaNotifications } from './pizzetta-notifications'

export type StaffSession = { authenticated: boolean; subject_id?: string; role?: 'ADMIN' | 'MANAGER' | 'CASHIER'; branch_id?: string | null }

export default function StaffAccess() {
  const [session, setSession] = useState<StaffSession | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadSession = async () => {
    const response = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
    const payload = await response.json() as { data?: StaffSession }
    if (response.ok && payload.data?.authenticated && payload.data.role) setSession(payload.data)
  }

  useEffect(() => { void loadSession().catch(() => undefined) }, [])

  const login = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null)
    try {
      const response = await fetch('/api/auth/staff/password/login', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const payload = await response.json() as { data?: unknown; message?: string; error?: { message?: string } }
      if (!response.ok) throw new Error(payload.message ?? payload.error?.message ?? 'Username or password is invalid')
      await loadSession()
      void enablePizzettaNotifications()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to sign in') } finally { setBusy(false) }
  }

  if (session?.authenticated && session.role) return <StaffConsole session={session} />
  return <main className="staff-login"><div className="staff-login-card"><span className="world-kicker">PIZZETTA RESTAURANT</span><h1>Staff sign in</h1><p>Use your assigned restaurant username and password.</p><form onSubmit={login}><label>Username<input autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label><button className="place-order" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form>{error && <p className="api-error" role="alert">{error}</p>}</div></main>
}
