type Env = { DB: D1Database; ASSETS: Fetcher; ENVIRONMENT?: string; PIZZETTA_OWNER_EMAIL?: string }
type OrderItemInput = { menuItemId: string; variantLabel?: string; quantity: number; notes?: string }
type OrderInput = { branchId?: string; customerId?: string; serviceMode: 'DINE_IN' | 'PICKUP'; scheduledFor?: string; tableLabel?: string; notes?: string; items: OrderItemInput[] }

const json = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const error = (message: string, status = 400) => json({ code: 'PIZZETTA_API_ERROR', message }, status)
const id = () => crypto.randomUUID()
const orderNumber = () => `P-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`

const readJson = async <T>(request: Request) => {
  try { return await request.json() as T } catch { throw new Error('Invalid JSON body') }
}

async function menu(env: Env) {
  return env.DB.prepare(`SELECT mi.id, mi.sku, mi.name, mi.subtitle, mi.description, mi.kind, mi.badge, mi.ingredients_json, mi.allergens_json, mc.slug AS category_slug, mc.name AS category_name, miv.label AS variant_label, miv.price_centavos FROM menu_items mi JOIN menu_categories mc ON mc.id=mi.category_id JOIN menu_item_variants miv ON miv.menu_item_id=mi.id AND miv.is_active=1 WHERE mi.is_active=1 ORDER BY mc.sort_order, mi.sort_order, miv.sort_order`).all()
}

async function createOrder(env: Env, input: OrderInput) {
  if (!['DINE_IN', 'PICKUP'].includes(input.serviceMode) || !Array.isArray(input.items) || input.items.length === 0) throw new Error('serviceMode and at least one item are required')
  const branchId = input.branchId ?? 'branch-poblacion'
  const lines: Array<{ item: Record<string, unknown>; variantLabel: string; unitPrice: number; quantity: number; notes?: string }> = []
  for (const requested of input.items) {
    if (!requested.menuItemId || !Number.isInteger(requested.quantity) || requested.quantity < 1 || requested.quantity > 50) throw new Error('Invalid order item')
    const row = await env.DB.prepare(`SELECT mi.*, COALESCE(miv.label, '') AS variant_label, COALESCE(miv.price_centavos, 0) AS variant_price FROM menu_items mi LEFT JOIN menu_item_variants miv ON miv.menu_item_id=mi.id AND miv.is_active=1 AND (? IS NULL OR miv.label=?) JOIN branch_menu_items bmi ON bmi.menu_item_id=mi.id AND bmi.branch_id=? AND bmi.is_available=1 WHERE mi.id=? AND mi.is_active=1 LIMIT 1`).bind(requested.variantLabel ?? null, requested.variantLabel ?? null, branchId, requested.menuItemId).first<Record<string, unknown>>()
    if (!row) throw new Error(`Menu item unavailable: ${requested.menuItemId}`)
    lines.push({ item: row, variantLabel: String(row.variant_label), unitPrice: Number(row.variant_price), quantity: requested.quantity, notes: requested.notes })
  }
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  const orderId = id(); const now = new Date().toISOString(); const number = orderNumber()
  const statements = [env.DB.prepare(`INSERT INTO orders (id, order_number, branch_id, customer_id, service_mode, status, scheduled_for, table_label, subtotal_centavos, total_centavos, notes, created_at, updated_at) VALUES (?,?,?,?,?,'RECEIVED',?,?,?,?,?,?,?)`).bind(orderId, number, branchId, input.customerId ?? null, input.serviceMode, input.scheduledFor ?? null, input.tableLabel ?? null, subtotal, subtotal, input.notes ?? null, now, now), ...lines.map(line => env.DB.prepare(`INSERT INTO order_items (id, order_id, menu_item_id, variant_label, item_name_snapshot, ingredients_snapshot_json, allergens_snapshot_json, unit_price_centavos, quantity, line_total_centavos, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(id(), orderId, line.item.id, line.variantLabel, line.item.name, line.item.ingredients_json ?? '[]', line.item.allergens_json ?? '[]', line.unitPrice, line.quantity, line.unitPrice * line.quantity, line.notes ?? null)), env.DB.prepare(`INSERT INTO order_events (id, order_id, to_status, actor_type, created_at) VALUES (?,?,?,'customer',?)`).bind(id(), orderId, 'RECEIVED', now)]
  await env.DB.batch(statements)
  return { id: orderId, order_number: number, status: 'RECEIVED', branch_id: branchId, service_mode: input.serviceMode, subtotal_centavos: subtotal, total_centavos: subtotal, created_at: now }
}

async function getOrder(env: Env, orderId: string) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id=? OR order_number=?').bind(orderId, orderId).first<Record<string, unknown>>()
  if (!order) return null
  const items = await env.DB.prepare('SELECT * FROM order_items WHERE order_id=? ORDER BY rowid').bind(order.id).all()
  const events = await env.DB.prepare('SELECT * FROM order_events WHERE order_id=? ORDER BY created_at').bind(order.id).all()
  return { ...order, items: items.results, events: events.results }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url); const path = url.pathname.replace(/\/$/, '')
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' } })
    try {
      if (request.method === 'GET' && path === '/api/health') return json({ ok: true, service: 'pizzetta-kiosk-os', environment: env.ENVIRONMENT ?? 'unknown' })
      if (request.method === 'GET' && path === '/api/menu') return json(await menu(env))
      if (request.method === 'GET' && path === '/api/branches') return json(await env.DB.prepare('SELECT id, code, name, address, latitude, longitude, timezone FROM branches WHERE is_active=1 ORDER BY name').all())
      if (request.method === 'POST' && path === '/api/orders') return json(await createOrder(env, await readJson<OrderInput>(request)), 201)
      const orderMatch = path.match(/^\/api\/orders\/([^/]+)$/)
      if (request.method === 'GET' && orderMatch) { const result = await getOrder(env, decodeURIComponent(orderMatch[1])); return result ? json(result) : error('Order not found', 404) }
      return env.ASSETS.fetch(request)
    } catch (caught) { return error(caught instanceof Error ? caught.message : 'Unexpected Pizzetta API error', 400) }
  },
}
