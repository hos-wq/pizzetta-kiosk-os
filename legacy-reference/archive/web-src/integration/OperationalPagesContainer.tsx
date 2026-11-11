import { useCallback, useEffect, useRef, useState } from 'react'
import { OperationalPages, type OperationalPageData, type OperationalRoomDetailData } from '../../../../UI/src/integration/OperationalPages'
import type { NestedPathNode } from '../../../../UI/src/components/NestedPathMenu'
import type { CalendarDayEvent } from '../../../../UI/src/components/CalendarDayDetails'
import type { RoomFixture } from '../../../../UI/src/fixtures'
import { buildServiceTree, type OperationalCatalogNode } from './service-hierarchy'
import { displayRoomRef, mapAttentionItems, mapPerson } from './operational-mappers'

type Json = Record<string, unknown>
type ApiFetch = <T>(path: string, options?: RequestInit) => Promise<T>
type Props = { apiFetch: ApiFetch }
type CatalogNode = OperationalCatalogNode

const text = (value: unknown, fallback = '') => value == null ? fallback : String(value)
function mapRoom(row: Json): RoomFixture {
  const occupancy = text(row.occupancy_state ?? row.status, 'UNKNOWN').toUpperCase()
  const id = text(row.id, 'UNKNOWN')
  const projection = row.occupancy_projection && typeof row.occupancy_projection === 'object' ? row.occupancy_projection as Json : {}
  const tenancy = row.current_tenancy && typeof row.current_tenancy === 'object' ? row.current_tenancy as Json : null
  const tenancySummary = tenancy ? `${text(tenancy.tenant_name, 'TENANT NOT RECORDED')} · ${text(tenancy.start_at, '').slice(0, 10)} → ${text(tenancy.end_at, 'OPEN')}` : undefined
  return { id, displayId: text(row.canonical_display_id, id), unit: text(row.physical_unit_number ?? row.actual_unit_number ?? row.id).replace(/^U-/, ''), occupancy: occupancy.includes('OCCUP') ? 'OCCUPIED' : occupancy.includes('RESERV') ? 'RESERVED' : 'READY', maintenance: 'NORMAL', housekeeping: 'READY', nextDate: text(row.next_available_at, 'NOT PROVIDED').slice(0, 10), declaredOccupancy: text(projection.declared_occupancy, 'UNKNOWN'), physicalOccupancyEvidence: text(projection.physical_occupancy_evidence, 'NOT_RECORDED'), allocationAvailability: text(projection.allocation_availability, 'UNKNOWN'), tenancySummary }
}

function mapEvent(row: Json, index: number): CalendarDayEvent & { date?: string } {
  const roomId = row.unit_id ?? row.room_id
  return { id: text(row.projection_id ?? row.id, `event-${index}`), date: text(row.date ?? row.event_date ?? row.start_at, '').slice(0, 10), title: text(row.title ?? row.event_type, 'Operational event'), meta: [roomId, row.person_name, row.status].filter(Boolean).map(displayRoomRef).join(' · '), roomId: roomId ? String(roomId) : undefined }
}

async function loadCatalog(apiFetch: ApiFetch): Promise<{ tree: NestedPathNode[]; nodes: CatalogNode[] }> {
  const types = ['MAINTENANCE', 'HOUSEKEEPING'] as const
  const all: CatalogNode[] = []
  for (const serviceType of types) {
    for (const level of ['MACRO', 'CATEGORY', 'OBJECT', 'ACTION'] as const) {
      const rows = await apiFetch<CatalogNode[]>(`/api/v2/services/catalog?service_type=${serviceType}&level=${level}`)
      all.push(...rows)
    }
  }
  const tree = buildServiceTree(all)
  const roots = new Map(all.map((node) => [node.id, node]))
  return { tree: tree.map((service) => ({ ...service, children: service.children?.map((type) => ({ ...type, children: type.children?.filter((macro) => roots.get(macro.id)?.service_type === type.id) })) })), nodes: all }
}

export function OperationalPagesContainer({ apiFetch }: Props) {
  const [data, setData] = useState<OperationalPageData>({ rooms: [], people: [], tasks: [], events: [], serviceNodes: {}, loadState: 'loading' })
  const [refreshToken, setRefreshToken] = useState(0)
  const [roomDetails, setRoomDetails] = useState<Record<string, OperationalRoomDetailData>>({})
  const catalogNodes = useRef<CatalogNode[]>([])

  const loadRoomDetails = useCallback(async (roomId: string) => {
    setRoomDetails(current => ({ ...current, [roomId]: { ...current[roomId], loadState: 'loading' } }))
    const [listing, tenant, utilities, room] = await Promise.allSettled([
      apiFetch<Json>(`/api/v2/rooms/${encodeURIComponent(roomId)}/listing`),
      apiFetch<Json>(`/api/v2/rooms/${encodeURIComponent(roomId)}/tenant`),
      apiFetch<Json>(`/api/v2/rooms/${encodeURIComponent(roomId)}/utilities`),
      apiFetch<Json>(`/api/v1/units/${encodeURIComponent(roomId)}`),
    ])
    const fulfilled = [listing, tenant, utilities, room].filter(result => result.status === 'fulfilled').length
    setRoomDetails(current => ({ ...current, [roomId]: { listing: listing.status === 'fulfilled' ? listing.value : current[roomId]?.listing, tenant: tenant.status === 'fulfilled' ? tenant.value : current[roomId]?.tenant, utilities: utilities.status === 'fulfilled' ? utilities.value : current[roomId]?.utilities, room: room.status === 'fulfilled' ? room.value : current[roomId]?.room, loadState: fulfilled === 4 ? 'ready' : fulfilled ? 'partial' : 'error' } }))
  }, [apiFetch])
  const saveRoomField = useCallback(async (roomId: string, fieldKey: string, value: string) => {
    await apiFetch(`/api/v2/rooms/${encodeURIComponent(roomId)}/listing`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fields: { [fieldKey]: value } }) })
    await loadRoomDetails(roomId)
  }, [apiFetch, loadRoomDetails])

  const createPerson = useCallback(async (displayName: string) => {
    await apiFetch('/api/v1/people', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ display_name: displayName }) })
    setRefreshToken((value) => value + 1)
  }, [apiFetch])

  const createServiceTask = useCallback(async (roomId: string, actionId: string) => {
    const action = catalogNodes.current.find((node) => node.id === actionId && node.level === 'ACTION')
    const object = action && catalogNodes.current.find((node) => node.id === action.parent_id && node.level === 'OBJECT')
    const category = object && catalogNodes.current.find((node) => node.id === object.parent_id && node.level === 'CATEGORY')
    const macro = category && catalogNodes.current.find((node) => node.id === category.parent_id && node.level === 'MACRO')
    if (!action || !object || !category || !macro) throw new Error('SERVICE HIERARCHY UNAVAILABLE')
    await apiFetch('/api/v2/services', { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ service_type: action.service_type, unit_id: roomId, object_key: object.node_key, action_key: action.node_key, object_snapshot: object.label, action_snapshot: action.label, catalog_macro_id: macro.id, catalog_category_id: category.id, catalog_object_id: object.id, catalog_action_id: action.id, priority: 'NORMAL' }) })
    setRefreshToken((value) => value + 1)
  }, [apiFetch])

  useEffect(() => {
    let active = true
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10)
      const from = new Date(`${today}T00:00:00+08:00`).toISOString()
      const to = new Date(Date.parse(from) + 46 * 86400000).toISOString()
      const [roomsResult, peopleResult] = await Promise.allSettled([
        apiFetch<Json[]>('/api/v1/units?limit=100&sort=id&direction=asc'),
        apiFetch<Json[]>('/api/v1/people?limit=100&sort=updated_at&direction=desc'),
      ])
      const roomsAvailable = roomsResult.status === 'fulfilled'
      const roomRows = roomsAvailable ? roomsResult.value : []
      const personRows = peopleResult.status === 'fulfilled' ? peopleResult.value : []
      const [dashboardResult, calendarResult, serviceResult] = await Promise.allSettled([
        apiFetch<{ attention?: Json[] }>('/api/v1/dashboard'),
        apiFetch<Json[]>(`/api/v2/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
        loadCatalog(apiFetch),
      ])
      if (!active) return
      const serviceNodes = serviceResult.status === 'fulfilled' ? serviceResult.value : undefined
      if (serviceNodes) catalogNodes.current = serviceNodes.nodes
      setData({
        rooms: roomRows.map(mapRoom),
        people: personRows.map(mapPerson),
        tasks: dashboardResult.status === 'fulfilled' ? mapAttentionItems(dashboardResult.value.attention ?? []) : [],
        events: calendarResult.status === 'fulfilled' ? calendarResult.value.map(mapEvent) : [],
        serviceNodes: serviceNodes ? { ALL: serviceNodes.tree } : {},
        onCreatePerson: createPerson,
        onCreateServiceTask: createServiceTask,
        loadState: roomsAvailable ? (roomRows.length ? 'ready' : 'empty') : 'error',
        statusMessage: roomsAvailable ? undefined : 'ROOM DATA UNAVAILABLE',
      })
    }
    void load()
    return () => { active = false }
  }, [apiFetch, createPerson, createServiceTask, refreshToken])

  return <OperationalPages data={{ ...data, roomDetails, onLoadRoomDetails: loadRoomDetails, onSaveRoomField: saveRoomField }} />
}
