import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarScreen } from './CalendarScreen'

const event = { projection_id:'VIEWING:v1:VIEWING', event_type:'VIEWING', date:'2026-10-06', start_time:'10:30', end_time:'11:00', all_day:false, person_id:'p1', person_name:'Maria Cruz', room_id:'BR·07', source_entity_type:'VIEWING', source_entity_id:'v1', status:'CONFIRMED', priority:'HIGH', channel:'MESSENGER', labels:[], metadata:{} }

describe('CalendarScreen', () => {
  beforeEach(() => { window.history.replaceState({}, '', '/v2/office/calendar') })
  it('renders exactly 75 square day controls across five-row date columns', async () => {
    const apiFetch = vi.fn().mockResolvedValue([event])
    render(<CalendarScreen apiFetch={apiFetch} onNavigate={vi.fn()} />)
    expect(await screen.findAllByRole('gridcell')).toHaveLength(75)
    expect(screen.getByRole('grid', { name:/75 day/i })).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('from='))
  })

  it('opens day detail with available person, room, channel, status and priority', async () => {
    const apiFetch = vi.fn().mockResolvedValue([event])
    render(<CalendarScreen apiFetch={apiFetch} onNavigate={vi.fn()} />)
    fireEvent.click(await screen.findByRole('gridcell', { name:/2026-10-06/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name:/BR·07 Maria Cruz/ }))
    expect(screen.getByRole('button', { name:/Maria Cruz/ })).toHaveAccessibleName(expect.stringContaining('MESSENGER'))
    expect(screen.getByRole('button', { name:/Maria Cruz/ })).toHaveAccessibleName(expect.stringContaining('CONFIRMED'))
    expect(screen.getByRole('button', { name:/Maria Cruz/ })).toHaveAccessibleName(expect.stringContaining('HIGH'))
    fireEvent.click(screen.getByRole('button', { name:'Close' }))
  })

  it('keeps the heatmap semantics stable while filters change the detail set', async () => {
    const apiFetch = vi.fn().mockResolvedValue([event, { ...event, projection_id:'MAINTENANCE:m1:MAINTENANCE', event_type:'MAINTENANCE', status:'OPEN', priority:'URGENT' }])
    render(<CalendarScreen apiFetch={apiFetch} onNavigate={vi.fn()} />)
    const day = await screen.findByRole('gridcell', { name:/2026-10-06.*2 events/ })
    expect(day).toHaveAttribute('aria-label', expect.stringContaining('2 events'))
    fireEvent.click(screen.getByRole('button', { name:'MAINT' }))
    expect(day).toHaveAttribute('aria-label', expect.stringContaining('1 events'))
    fireEvent.click(day)
    fireEvent.click(screen.getByRole('button', { name:/BR·07 Maria Cruz/ }))
    expect(screen.getByRole('button', { name:/MAINTENANCE.*OPEN/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name:'Close' }))
  })

  it('renders a retry action after a load failure', async () => {
    const apiFetch = vi.fn().mockImplementation((path: string) => path.startsWith('/api/v2/calendar') ? Promise.reject(new Error('offline')) : Promise.resolve([]))
    render(<CalendarScreen apiFetch={apiFetch} onNavigate={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Calendar could not be loaded')
    fireEvent.click(screen.getByRole('button', { name:'Retry' }))
    expect(await screen.findByRole('grid', { name:/75 day/i })).toBeInTheDocument()
    expect(apiFetch.mock.calls.filter(([path]) => String(path).startsWith('/api/v2/calendar')).length).toBe(2)
  })

  it('opens a referenced record through the typed navigation boundary', async () => {
    render(<CalendarScreen apiFetch={vi.fn().mockResolvedValue([event])} onNavigate={vi.fn()} />)
    fireEvent.click(await screen.findByRole('gridcell', { name:/2026-10-06/ }))
    fireEvent.click(screen.getByRole('button', { name:/BR·07 Maria Cruz/ }))
    expect(screen.queryByRole('button', { name:'Open record' })).not.toBeInTheDocument()
    expect(screen.getByText('No supported related record destination.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name:'Close' }))
  })

  it('supports period navigation, Today and a visible date range without dropping the filter', async () => {
    window.history.replaceState({}, '', '/v2/office/calendar?anchor=2026-10-15&day=2026-10-15&filter=MAINTENANCE')
    render(<CalendarScreen apiFetch={vi.fn().mockResolvedValue([])} onNavigate={vi.fn()} />)
    expect(screen.getByRole('button', { name:'Previous period' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name:'Next period' })).toBeInTheDocument()
    expect(screen.getByText('2026-09-10 → 2026-11-23')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name:'Next period' }))
    expect(new URLSearchParams(window.location.search).get('filter')).toBe('MAINTENANCE')
    expect(new URLSearchParams(window.location.search).get('anchor')).toBe('2026-12-29')
    fireEvent.click(screen.getByRole('button', { name:'Today' }))
    expect(new URLSearchParams(window.location.search).get('anchor')).toMatch(/^2026-10-15$/)
  })

  it('restores an event detail from the URL and clears an unknown event safely', async () => {
    window.history.replaceState({}, '', '/v2/office/calendar?anchor=2026-10-06&day=2026-10-06&filter=VIEWING&detail=1&event=VIEWING:v1:VIEWING')
    render(<CalendarScreen apiFetch={vi.fn().mockResolvedValue([event])} onNavigate={vi.fn()} />)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByDisplayValue('VIEWING')).toBeInTheDocument()
    expect((await screen.findAllByDisplayValue('Not recorded')).length).toBeGreaterThan(0)

    window.history.replaceState({}, '', '/v2/office/calendar?anchor=2026-10-06&day=2026-10-06&filter=VIEWING&detail=1&event=stale')
    fireEvent(window, new PopStateEvent('popstate'))
    await new Promise(resolve => window.setTimeout(resolve, 10))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(new URLSearchParams(window.location.search).get('event')).toBeNull()
  })

  it('composes room, person and event-type filters with AND semantics', async () => {
    const renewal = { ...event, projection_id:'TENANCY_CONTRACT_VERSION:cv-2:TENANCY_RENEWAL', event_type:'TENANCY_RENEWAL', date:'2026-10-15', room_id:'BR·27', person_id:'jeff', person_name:'Padilla Jeff Emmanuel Irinco' }
    const apiFetch = vi.fn().mockImplementation(async (path: string) => { const decodedPath = decodeURIComponent(path); return decodedPath.startsWith('/api/v1/units/BR·27') ? { id:'BR·27', occupancy_projection:{ declared_occupancy:'OCCUPIED', physical_occupancy_evidence:'NOT_RECORDED', allocation_availability:'BLOCKED' } } : decodedPath.startsWith('/api/v1/units') ? [{ id:'BR·03', actual_unit_number:'1003' }, { id:'BR·27', actual_unit_number:'2704B' }] : decodedPath.startsWith('/api/v1/people') ? [{ id:'bianca', display_name:'Bianca Dema-ala Liwanag' }, { id:'jeff', display_name:'Padilla Jeff Emmanuel Irinco' }] : [event, renewal] })
    render(<CalendarScreen apiFetch={apiFetch} onNavigate={vi.fn()} />)
    const room = await screen.findByLabelText('ROOM')
    const person = await screen.findByLabelText('PERSON')
    fireEvent.change(room, { target:{ value:'BR·27' } })
    fireEvent.change(person, { target:{ value:'jeff' } })
    fireEvent.click(screen.getByRole('button', { name:'RENEW' }))
    const selectedDay = await screen.findByRole('gridcell', { name:/2026-10-15.*1 events/ })
    expect(selectedDay).toHaveAttribute('aria-label', expect.stringContaining('TENANCY_RENEWAL'))
    expect(await screen.findByText('Declared occupancy: OCCUPIED')).toBeInTheDocument()
    expect(await screen.findByText('Allocation: BLOCKED')).toBeInTheDocument()
    expect(new URLSearchParams(window.location.search).get('room')).toBe('BR·27')
    expect(new URLSearchParams(window.location.search).get('person')).toBe('jeff')
  })

  it('uses a tenancy target rather than a contract-version source id', async () => {
    const onNavigate = vi.fn()
    const renewal = { ...event, event_type:'TENANCY_RENEWAL', projection_id:'TENANCY_CONTRACT_VERSION:cv-2:TENANCY_RENEWAL', source_entity_type:'TENANCY_CONTRACT_VERSION', source_entity_id:'cv-2', navigation_target:{ screen:'tenancies', entity_id:'tenancy-jeff-br27', params:{ panel:'TERMS', contract_version:'cv-2' } }, date:'2026-10-15', room_id:'BR·27', person_name:'Padilla Jeff Emmanuel Irinco' }
    render(<CalendarScreen apiFetch={vi.fn().mockResolvedValue([renewal])} onNavigate={onNavigate} />)
    fireEvent.click(await screen.findByRole('gridcell', { name:/2026-10-15/ }))
    fireEvent.click(screen.getByRole('button', { name:/BR·27 Padilla Jeff Emmanuel Irinco/ }))
    fireEvent.click(screen.getByRole('button', { name:'Open record' }))
    expect(onNavigate).toHaveBeenCalledWith('tenancies', 'tenancy-jeff-br27', { panel:'TERMS', contract_version:'cv-2' })
  })

  it('opens one inline wheel at a time and marks edits as local', async () => {
    render(<CalendarScreen apiFetch={vi.fn().mockResolvedValue([event])} onNavigate={vi.fn()} />)
    fireEvent.click(await screen.findByRole('gridcell', { name:/2026-10-06/ }))
    fireEvent.click(screen.getByRole('button', { name:'Add event on 2026-10-06' }))
    fireEvent.click(screen.getByDisplayValue('2026-10-06'))
    expect(screen.getByRole('listbox', { name:'DAY' })).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('TIME'))
    expect(screen.queryByRole('listbox', { name:'DAY' })).not.toBeInTheDocument()
    expect(screen.getByRole('listbox', { name:'HOUR' })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('option', { name:'11' })[0])
    expect(screen.getByText(/NOT SAVED/)).toBeInTheDocument()
  })
})
