import { describe, expect, it } from 'vitest'
import { mapAttentionItems, mapPerson, roomAvailabilityLabel, tenancyOccupancyLabel } from './operational-mappers'

describe('operational page mappers', () => {
  it('resolves a person room only from the current tenancy', () => {
    expect(mapPerson({
      id: 'bianca',
      display_name: 'Bianca Dema-ala Liwanag',
      current_tenancy: { unit_id: 'BR·03' },
      tenancies: [{ unit_id: 'BR·99' }],
    }).room).toBe('BR•03')
    expect(mapPerson({ id: 'unassigned', display_name: 'No tenancy', tenancies: [{ unit_id: 'BR·08' }] }).room).toBe('NO ROOM')
  })

  it('preserves attention kinds and never defaults unknown items to maintenance', () => {
    const tasks = mapAttentionItems([
      { kind: 'CHECK_IN_MISSING', id: 'checkin-1', unit_id: 'BR·03', status: 'OPEN' },
      { kind: 'RENEWAL_BOUNDARY', id: 'renewal-1', unit_id: 'BR·27', status: 'OPEN' },
      { kind: 'DOCUMENT_REQUIRED', id: 'doc-1', unit_id: 'BR·03', label: 'VALID_ID', status: 'REQUIRED' },
      { kind: 'CONTRACT_EXPIRY', id: 'expiry-1', unit_id: 'BR·03', status: 'OPEN' },
      { kind: 'UNKNOWN_SIGNAL', id: 'unknown-1', status: 'OPEN' },
    ])
    expect(tasks.map(task => task.category)).toEqual(['ATTENTION', 'ATTENTION', 'ATTENTION', 'ATTENTION', 'ATTENTION'])
    expect(tasks.map(task => task.sourceKind)).toEqual(['CHECK_IN_MISSING', 'RENEWAL_BOUNDARY', 'DOCUMENT_REQUIRED', 'CONTRACT_EXPIRY', 'UNKNOWN_SIGNAL'])
    expect(tasks.find(task => task.sourceKind === 'DOCUMENT_REQUIRED')?.status).toBe('REQUIRED')
  })

  it('deduplicates the same source occurrence without hiding distinct due dates', () => {
    const tasks = mapAttentionItems([
      { kind: 'DOCUMENT_REQUIRED', id: 'doc-1', due_at: '2026-10-15', status: 'REQUIRED' },
      { kind: 'DOCUMENT_REQUIRED', id: 'doc-1', due_at: '2026-10-15', status: 'REQUIRED' },
      { kind: 'DOCUMENT_REQUIRED', id: 'doc-1', due_at: '2026-10-16', status: 'REQUIRED' },
    ])
    expect(tasks).toHaveLength(2)
  })

  it('keeps allocation and occupancy states explicit rather than conflating them', () => {
    expect(roomAvailabilityLabel('AVAILABLE', 'BLOCKED')).toBe('STATUS AVAILABLE · ALLOCATION BLOCKED')
    expect(tenancyOccupancyLabel('OCCUPIED', 'NOT_RECORDED', 'RESERVED')).toContain('DECLARED OCCUPIED')
    expect(tenancyOccupancyLabel('OCCUPIED', 'NOT_RECORDED', 'RESERVED')).toContain('PHYSICAL CHECK-IN NOT_RECORDED')
    expect(tenancyOccupancyLabel('OCCUPIED', 'NOT_RECORDED', 'RESERVED')).toContain('CONTRACT OCCUPANCY RESERVED')
  })
})
