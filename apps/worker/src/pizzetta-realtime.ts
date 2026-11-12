type RealtimeMessage = { type: string; channel: string; at: string; payload: unknown }

export class PizzettaRealtime {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request) {
    const url = new URL(request.url)
    if (request.method === 'POST' && url.pathname === '/publish') {
      const message = await request.json() as RealtimeMessage
      this.broadcast(message)
      return new Response(JSON.stringify({ ok: true, delivered: this.state.getWebSockets().length }), { headers: { 'content-type': 'application/json' } })
    }
    if (request.method === 'GET' && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair()
      this.state.acceptWebSocket(pair[1])
      pair[1].send(JSON.stringify({ type: 'READY', channel: url.searchParams.get('channel') ?? 'unknown', at: new Date().toISOString() }))
      return new Response(null, { status: 101, webSocket: pair[0] })
    }
    return new Response('Not found', { status: 404 })
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (message === 'ping' || (typeof message === 'string' && message === 'ping')) socket.send(JSON.stringify({ type: 'PONG', at: new Date().toISOString() }))
  }

  webSocketClose() { /* socket lifecycle is managed by Durable Objects */ }
  webSocketError() { /* disconnected clients are removed by the runtime */ }

  private broadcast(message: RealtimeMessage) {
    const encoded = JSON.stringify(message)
    for (const socket of this.state.getWebSockets()) {
      try { socket.send(encoded) } catch { /* stale socket; runtime will clean it up */ }
    }
  }
}
