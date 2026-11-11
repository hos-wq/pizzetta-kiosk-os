import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ListingScreen } from './ListingScreen'

const rooms = ['BR·02', 'BR·03', 'BR·04', 'BR·05', 'BR·07', 'BR·08', 'BR·09', 'BR·10', 'BR·27', 'BR·32'].map((id, index) => ({ id, actual_unit_number: `U-${1002 + index}`, status: 'AVAILABLE', occupancy_state: 'VACANT', type: 'Studio', floor: 10, sqm: 24, updated_at: '2026-10-12T00:00:00.000Z' }))

describe('ListingScreen', () => {
  it('renders the canonical room cover and opens the universal listing lightbox', async () => {
    const apiFetch = vi.fn().mockResolvedValue(rooms)
    render(<ListingScreen apiFetch={apiFetch} />)
    expect(await screen.findAllByRole('button', { name: /Open BR·/ })).toHaveLength(10)
    expect(screen.getByRole('button', { name: /Open BR·02 listing/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Open BR·07 listing/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'BR·07' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Listing sections' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'OCCUPIED' } })
    expect(screen.getByText('LOCAL EDITS · NOT SAVED')).toBeInTheDocument()
  })

  it('opens the room encoded in navigation context after returning from People', async () => {
    const apiFetch = vi.fn().mockResolvedValue(rooms)
    render(<ListingScreen apiFetch={apiFetch} initialRoomId="BR·07" />)
    expect(await screen.findByRole('heading', { name: 'BR·07' })).toBeInTheDocument()
  })

  it('does not fabricate unavailable tenant data', async () => {
    const apiFetch = vi.fn().mockImplementation(async (path: string) => path.includes('/tenant') ? { room_id: 'BR·07', tenancy: null, person: null } : [{ id: 'BR·07', status: 'AVAILABLE' }])
    render(<ListingScreen apiFetch={apiFetch} />)
    fireEvent.click(await screen.findByRole('button', { name: /Open BR·07 listing/ }))
    expect(screen.getAllByText('NOT PROVIDED').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'TENANT' }))
    fireEvent.click(screen.getByRole('button', { name: 'PERSONAL' }))
    expect(await screen.findByText('NO ACTIVE OR UPCOMING TENANCY')).toBeInTheDocument()
  })

  it('renders canonical personal, contract, finance and document data in the Tenant drawer', async () => {
    const tenant = { room_id: 'BR·07', person: { id: 'p1', display_name: 'Ana Tenant', phone: '+63 900', email: 'ana@example.com' }, tenancy: { id: 't1', status: 'ACTIVE', start_at: '2026-10-01', end_at: '2027-10-01', monthly_rent_centavos: 2500000, security_deposit_centavos: 2500000, advance_amount_centavos: 0, payment_due_day: 5, operational: { contract: { id: 'd1' }, documents: [{ id: 'd1', document_type: 'CONTRACT', reference: 'drive-file-1', label: 'Signed contract' }] }, payments: [{ id: 'pay1', type: 'RENT', status: 'PAID', amount_centavos: 2500000, due_date: '2026-10-05' }] } }
    const apiFetch = vi.fn().mockImplementation(async (path: string) => path.includes('/tenant') ? tenant : path.includes('/listing') ? { unit: { id: 'BR·07', updated_at: '2026-10-12T00:00:00.000Z' }, fields: [] } : rooms)
    render(<ListingScreen apiFetch={apiFetch} />)
    fireEvent.click(await screen.findByRole('button', { name: /Open BR·07 listing/ }))
    fireEvent.click(screen.getByRole('button', { name: 'TENANT' }))
    expect(await screen.findByDisplayValue('Ana Tenant')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'CONTRACT' }))
    expect(screen.getByDisplayValue('REFERENCED')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'FINANCE' }))
    expect(screen.getByText('₱25,000.00 · RENT')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'DOCUMENTS' }))
    expect(screen.getByText('CONTRACT · Signed contract')).toBeInTheDocument()
  })

  it('renders persistent water history and derived consumption in the Utilities drawer', async () => {
    const utility = { unit_id: 'BR·07', services: [{ utility_type: 'WATER', meter_identifier: 'W-07', average_month: '12.5', billing: 'OWNER' }], readings: { WATER: [{ id: 'r2', reading_value: '104.5', consumption: 4.5, recorded_at: '2026-10-02T09:00:00Z', meter_event: 'READING' }], ELECTRICITY: [] } }
    const apiFetch = vi.fn().mockImplementation(async (path: string) => path.includes('/utilities') ? utility : path.includes('/listing') ? { unit: { id: 'BR·07', updated_at: '2026-10-12T00:00:00.000Z' }, fields: [] } : rooms)
    render(<ListingScreen apiFetch={apiFetch} />)
    fireEvent.click(await screen.findByRole('button', { name: /Open BR·07 listing/ }))
    fireEvent.click(screen.getByRole('button', { name: 'UTILITIES' }))
    expect(await screen.findByDisplayValue('W-07')).toBeInTheDocument()
    expect(screen.getByText('104.5 m³ · +4.5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add water reading' })).toBeInTheDocument()
  })

  it('persists a supported ROOM field and reloads authoritative data', async () => {
    let saved = false
    const apiFetch = vi.fn().mockImplementation(async (_path: string, options?: RequestInit) => {
      if (options?.method === 'PATCH') { saved = true; return { ...rooms[4], type: 'Deluxe' } }
      return rooms.map(room => room.id === 'BR·07' && saved ? { ...room, type: 'Deluxe' } : room)
    })
    render(<ListingScreen apiFetch={apiFetch} />)
    fireEvent.click(await screen.findByRole('button', { name: /Open BR·07 listing/ }))
    fireEvent.click(screen.getByRole('button', { name: 'BUILDING' }))
    fireEvent.change(screen.getByDisplayValue('Studio'), { target: { value: 'Deluxe' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('SAVED')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/units/BR%C2%B707', expect.objectContaining({ method: 'PATCH' }))
    expect(screen.getByDisplayValue('Deluxe')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('button', { name: /Open BR·02 listing/ })).toBeInTheDocument()
  })

  it('loads and saves an additional typed Listing category through the Listing contract', async () => {
    const listing = { unit: { id: 'BR·07', updated_at: '2026-10-12T00:00:00.000Z' }, fields: [{ key: 'city', category: 'ROOM_GENERAL', label: 'CITY', type: 'TEXT', value: 'Makati', system_defined: true }] }
    const apiFetch = vi.fn().mockImplementation(async (path: string, options?: RequestInit) => {
      if (path.includes('/listing') && options?.method === 'PATCH') return listing
      if (path.includes('/listing')) return listing
      return rooms
    })
    render(<ListingScreen apiFetch={apiFetch} />)
    fireEvent.click(await screen.findByRole('button', { name: /Open BR·07 listing/ }))
    expect(await screen.findByDisplayValue('Makati')).toBeInTheDocument()
    fireEvent.change(screen.getByDisplayValue('Makati'), { target: { value: 'Makati City' } })
    fireEvent.click(screen.getByRole('button', { name: 'GENERAL' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('SAVED')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith('/api/v2/rooms/BR%C2%B707/listing', expect.objectContaining({ method: 'PATCH' }))
  })
})
