import type { PersonFixture, TaskFixture } from '../../../../UI/src/fixtures'

export type Json = Record<string, unknown>

const text = (value: unknown, fallback = '') => value == null ? fallback : String(value)

export const displayRoomRef = (value: unknown) => text(value, 'NO ROOM').replace(/^BR·(\d+)$/, 'BR•$1')

export function mapPerson(row: Json): PersonFixture {
  const currentTenancy = row.current_tenancy && typeof row.current_tenancy === 'object' ? row.current_tenancy as Json : null
  const currentRoom = currentTenancy?.unit_id ?? currentTenancy?.room_id ?? (
    currentTenancy?.room && typeof currentTenancy.room === 'object' ? (currentTenancy.room as Json).id : undefined
  )
  return {
    id: text(row.id),
    name: text(row.display_name, 'Unnamed person'),
    role: text(row.role ?? row.latest_lead_status, 'CONTACT'),
    room: displayRoomRef(currentRoom),
    detail: text(row.last_activity, 'No recent activity'),
  }
}

const attentionTitles: Record<string, string> = {
  CHECK_IN_MISSING: 'CHECK-IN EVIDENCE MISSING',
  RENEWAL_BOUNDARY: 'RENEWAL BOUNDARY',
  DOCUMENT_REQUIRED: 'DOCUMENT REQUIRED',
  CONTRACT_EXPIRY: 'CONTRACT EXPIRY',
  TERMINATION_FOLLOW_UP: 'TERMINATION FOLLOW-UP',
  TURNOVER: 'TURNOVER',
  MESSAGING: 'MESSAGING',
  MAINTENANCE: 'MAINTENANCE',
  HOUSEKEEPING: 'HOUSEKEEPING',
}

const attentionCategory = (kind: string): TaskFixture['category'] => {
  if (kind === 'MESSAGING') return 'MESSAGES'
  if (kind === 'MAINTENANCE') return 'MAINTENANCE'
  if (kind === 'HOUSEKEEPING') return 'HOUSEKEEPING'
  return 'ATTENTION'
}

function attentionObject(kind: string, row: Json) {
  if (kind === 'DOCUMENT_REQUIRED') return `Required document: ${text(row.label, 'Not specified')}`
  if (kind === 'CHECK_IN_MISSING') return 'Physical check-in evidence is not recorded'
  if (kind === 'RENEWAL_BOUNDARY') return `Contract version ${text(row.version_number, 'boundary')}`
  if (kind === 'CONTRACT_EXPIRY') return 'Contract end boundary'
  return text(row.title ?? row.label ?? row.reason ?? row.signal_key, 'Operational attention')
}

export function mapAttentionItems(rows: Json[]): TaskFixture[] {
  const seen = new Set<string>()
  return rows.flatMap((row, index) => {
    const kind = text(row.kind ?? row.type, 'ATTENTION').toUpperCase()
    const id = text(row.id, `attention-${index}`)
    const dueAt = text(row.due_at ?? row.dueAt ?? row.event_date)
    const dedupeKey = `${kind}:${id}:${dueAt}`
    if (seen.has(dedupeKey)) return []
    seen.add(dedupeKey)
    const title = attentionTitles[kind] ?? `ATTENTION: ${kind}`
    return [{
      id,
      category: attentionCategory(kind),
      room: displayRoomRef(row.unit_id ?? row.room_id),
      object: attentionObject(kind, row),
      action: title,
      status: text(row.status, 'NOT_RECORDED'),
      priority: text(row.priority, '').toUpperCase() === 'URGENT' ? 'URGENT' : 'NORMAL',
      sourceKind: kind,
      sourceId: id,
      sourceStatus: text(row.status, 'NOT_RECORDED'),
      dueAt,
      service: text(row.service_type),
      macro: text(row.macro),
      taxonomyCategory: text(row.category),
    }]
  })
}

export function roomAvailabilityLabel(status: unknown, allocation: unknown) {
  return `STATUS ${text(status, 'UNKNOWN')} · ALLOCATION ${text(allocation, 'UNKNOWN')}`
}

export function tenancyOccupancyLabel(declared: unknown, physical: unknown, contract: unknown) {
  return `DECLARED ${text(declared, 'UNKNOWN')} · PHYSICAL CHECK-IN ${text(physical, 'NOT_RECORDED')} · CONTRACT OCCUPANCY ${text(contract, 'UNKNOWN')}`
}
