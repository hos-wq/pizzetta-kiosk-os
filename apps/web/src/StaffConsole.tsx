import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Plus, Minus, RefreshCw, Check, LogOut } from 'lucide-react'
import './PizzettaWorld.css'
import { announcePizzettaEvent, setPizzettaBadge } from './pizzetta-notifications'
import type { StaffSession } from './StaffAccess'
import { connectPizzettaRealtime } from './pizzetta-realtime'

type QueueOrder = { id: string; order_number: string; status: string; service_mode: string; payment_method: string; payment_status: string; total_centavos: number; version: number; prep_eta_at?: string; created_at: string }
type OrderRequest = { id: string; request_number: string; customer_name: string; whatsapp: string; service_mode: string; payment_method: string; receipt_json: string; created_at: string }
const branchNames: Record<string, string> = { 'branch-poblacion': 'Pobla', 'branch-antipolo': 'Antipolo', 'branch-bf-homes': 'BF Homes' }
const peso = (centavos: number) => `₱${(centavos / 100).toFixed(2)}`

export default function StaffConsole({ session }: { session: StaffSession }) {
  const branch = session.branch_id ?? ''
  const [queue, setQueue] = useState<QueueOrder[]>([])
  const [requests, setRequests] = useState<OrderRequest[]>([])
  const [paused, setPaused] = useState(false)
  const [wait, setWait] = useState(18)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const firstQueue = useRef(true)
  const canOperate = session.role === 'ADMIN' || session.role === 'MANAGER'

  const refresh = async () => {
    if (!branch) { setError('No branch is assigned to this staff account.'); return }
    setLoading(true); setError(null)
    try {
      const [queueResponse, requestResponse] = await Promise.all([
        fetch(`/api/staff/branches/${branch}/queue`, { credentials: 'include', cache: 'no-store' }),
        fetch(`/api/staff/branches/${branch}/requests`, { credentials: 'include', cache: 'no-store' }),
      ])
      const payload = await queueResponse.json() as { data?: { results?: QueueOrder[] }; error?: { message?: string } }
      const requestPayload = await requestResponse.json() as { data?: { results?: OrderRequest[] } }
      if (!queueResponse.ok) throw new Error(payload.error?.message ?? 'Staff session expired')
      const next = payload.data?.results ?? []
      const previousIds = new Set(queue.map(order => order.id))
      const newOrders = next.filter(order => !previousIds.has(order.id))
      const pendingRequests = requestPayload.data?.results ?? []
      if (!firstQueue.current && (newOrders.length || pendingRequests.length > requests.length)) announcePizzettaEvent('New Pizzetta order', 'A request needs confirmation.', Math.max(newOrders.length, pendingRequests.length))
      setPizzettaBadge(newOrders.length + pendingRequests.length); firstQueue.current = false; setQueue(next); setRequests(pendingRequests)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load queue') } finally { setLoading(false) }
  }

  useEffect(() => { firstQueue.current = true; void refresh(); const timer = window.setInterval(() => void refresh(), 10000); if (!branch) return () => window.clearInterval(timer); const disconnect = connectPizzettaRealtime('branch', branch, () => void refresh()); return () => { window.clearInterval(timer); disconnect() } }, [branch])

  const operation = async (patch: { paused?: boolean; waitDelta?: number }) => {
    if (!canOperate) return
    const response = await fetch(`/api/staff/branches/${branch}/operations`, { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) })
    if (response.ok) { if (patch.paused !== undefined) setPaused(patch.paused); setWait(current => Math.max(0, current + (patch.waitDelta ?? 0))); void refresh() } else setError('Operation changed or permission denied')
  }

  const advance = async (order: QueueOrder) => {
    const next: Record<string, string> = { RECEIVED: 'ACCEPTED', ACCEPTED: 'PREPARING', PREPARING: 'READY', READY: 'COMPLETED' }
    const response = await fetch(`/api/staff/orders/${order.id}/status`, { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: next[order.status], version: order.version }) })
    if (response.ok) void refresh(); else setError('Order changed; refresh the queue')
  }

  const confirmRequest = async (item: OrderRequest) => {
    const response = await fetch(`/api/staff/order-requests/${item.id}/confirm`, { method: 'POST', credentials: 'include' })
    if (response.ok) void refresh(); else setError('Request changed; refresh the queue')
  }

  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); window.location.assign('/staff') }

  return <main className="staff-console"><header className="staff-console-header"><div><span className="world-kicker">PIZZETTA OPERATIONS</span><h1>Service control</h1><small>{branchNames[branch] ?? branch} · {session.role}</small></div><div><button className="world-header-link" onClick={() => void refresh()}><RefreshCw size={16} /> Refresh</button><button className="world-header-link" onClick={() => void logout()}><LogOut size={16} /> Sign out</button></div></header><section className="staff-controls"><div className="staff-control-card"><span className="world-kicker">NEW ORDERS</span><strong>{paused ? 'Paused' : 'Open'}</strong>{canOperate && <button onClick={() => void operation({ paused: !paused })}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Resume' : 'Pause'}</button>}</div><div className="staff-control-card"><span className="world-kicker">WAITING TIME</span><strong>{wait} min</strong>{canOperate && <div><button aria-label="Decrease wait" onClick={() => void operation({ waitDelta: -5 })}><Minus size={16} /></button><button aria-label="Increase wait" onClick={() => void operation({ waitDelta: 5 })}><Plus size={16} /></button></div>}</div></section>{error && <p className="api-error" role="alert">{error}</p>}{requests.length > 0 && <section className="staff-requests"><div className="queue-heading"><span className="world-kicker">AWAITING CONFIRMATION</span><strong>{requests.length} request{requests.length === 1 ? '' : 's'}</strong></div>{requests.map(item => { let receipt: { total_centavos?: number } = {}; try { receipt = JSON.parse(item.receipt_json) } catch { /* malformed receipt remains visible */ } return <article className="queue-card" key={item.id}><div><span className="queue-number">{item.request_number}</span><strong>{item.customer_name} · {item.service_mode === 'DINE_IN' ? 'Dine-in' : 'Pickup'}</strong><small>{item.whatsapp} · {item.payment_method} · {peso(receipt.total_centavos ?? 0)}</small></div><div className="queue-state"><span>SUBMITTED</span><button onClick={() => void confirmRequest(item)}><Check size={15} /> Confirm</button></div></article>})}</section>}<section className="staff-queue"><div className="queue-heading"><span className="world-kicker">LIVE QUEUE</span><strong>{loading ? 'Refreshing…' : `${queue.length} active orders`}</strong></div>{queue.map(order => <article className="queue-card" key={order.id}><div><span className="queue-number">{order.order_number}</span><strong>{order.service_mode === 'DINE_IN' ? 'Dine-in' : 'Pickup'}</strong><small>{order.payment_method} · {order.payment_status} · {peso(order.total_centavos)}</small></div><div className="queue-state"><span>{order.status}</span><button onClick={() => void advance(order)}>{order.status === 'READY' ? <Check size={15} /> : <Play size={15} />} {order.status === 'READY' ? 'Complete' : 'Advance'}</button></div></article>)}{!queue.length && !loading && <div className="queue-empty">No active orders for this branch.</div>}</section></main>
}
