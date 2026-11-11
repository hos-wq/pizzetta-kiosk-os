import { describe, expect, it } from 'vitest'
import { buildTemporalWindow, weekColumns } from '../apps/web/src/v2/calendar/temporal-window'
import { distinctEventTypes, workloadScore, workloadState } from '../apps/web/src/v2/calendar/workload'

describe('V2 calendar foundation', () => {
  it('uses the exact 75-day Manila window for 2026-10-06', () => {
    const windowData = buildTemporalWindow('2026-10-06')
    expect(windowData.startDate).toBe('2026-09-01')
    expect(windowData.endDateExclusive).toBe('2026-11-15')
    expect(windowData.from).toBe('2026-08-31T16:00:00.000Z')
    expect(windowData.to).toBe('2026-11-14T16:00:00.000Z')
    expect(windowData.days).toHaveLength(75)
    expect(weekColumns(windowData.days)).toHaveLength(15)
    expect(weekColumns(windowData.days).every(column => column.length === 5)).toBe(true)
  })
  it('has five deterministic workload states', () => { expect([0,1,3,6,9].map(workloadState)).toEqual(['EMPTY','LIGHT','MEDIUM','BUSY','HEAVY']) })
  it('does not inflate current workload with completed or cancelled events', () => {
    expect(workloadScore([{ eventType:'TASK', status:'COMPLETED' } as never, { eventType:'TASK', status:'CANCELLED' } as never])).toBe(0)
    expect(workloadScore([{ eventType:'TENANCY_START', status:'CONFIRMED' } as never])).toBe(2)
  })
  it('keeps repeated event types as one marker while scoring every event', () => {
    const events = [{ eventType:'TASK', status:'OPEN' }, { eventType:'TASK', status:'OPEN' }, { eventType:'VIEWING', status:'CONFIRMED' }] as never[]
    expect(distinctEventTypes(events)).toEqual(['TASK','VIEWING'])
    expect(workloadScore(events)).toBe(4)
  })
  it('uses MIXED semantics when more than four event types occur', () => {
    const events = ['TASK','VIEWING','MAINTENANCE','PAYMENT','RESERVATION'].map(eventType => ({ eventType, status:'OPEN' })) as never[]
    expect(distinctEventTypes(events)).toHaveLength(5)
    expect(distinctEventTypes(events).length > 4).toBe(true)
  })
})
