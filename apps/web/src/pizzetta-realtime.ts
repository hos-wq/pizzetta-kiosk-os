export type PizzettaRealtimeEvent = { type: string; channel: string; at: string; payload?: Record<string, unknown> }
export type RealtimeChannel = 'branch' | 'request' | 'order'

export function connectPizzettaRealtime(channel: RealtimeChannel, id: string, onEvent: (event: PizzettaRealtimeEvent) => void, accessToken?: string) {
  let socket: WebSocket | null = null
  let stopped = false
  let retryTimer: number | undefined
  let heartbeat: number | undefined
  let delay = 1000
  const connect = () => {
    if (stopped) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const token = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : ''
    socket = new WebSocket(`${protocol}//${window.location.host}/api/realtime/${channel}/${encodeURIComponent(id)}${token}`)
    socket.onopen = () => { delay = 1000; heartbeat = window.setInterval(() => socket?.send('ping'), 25000) }
    socket.onmessage = message => { try { const event = JSON.parse(message.data) as PizzettaRealtimeEvent; if (event.type !== 'READY' && event.type !== 'PONG') onEvent(event) } catch { /* ignore malformed event */ } }
    socket.onclose = () => { if (heartbeat) window.clearInterval(heartbeat); if (!stopped) { retryTimer = window.setTimeout(connect, delay); delay = Math.min(15000, delay * 2) } }
    socket.onerror = () => socket?.close()
  }
  connect()
  return () => { stopped = true; if (retryTimer) window.clearTimeout(retryTimer); if (heartbeat) window.clearInterval(heartbeat); socket?.close() }
}
