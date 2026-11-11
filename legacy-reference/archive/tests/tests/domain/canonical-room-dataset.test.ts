import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const dataset = JSON.parse(readFileSync('data/seed/br-os-rooms.v1.json', 'utf8')) as { rooms: Array<Record<string, any>>; buildings: Array<Record<string, any>>; shared_amenities: Record<string, any> }

describe('canonical BR OS room dataset', () => {
  it('contains the ten approved display identifiers and occupancy declaration', () => {
    expect(dataset.rooms.map((room) => room.display_id)).toEqual(['BR•02', 'BR•03', 'BR•04', 'BR•05', 'BR•07', 'BR•08', 'BR•09', 'BR•10', 'BR•27', 'BR•32'])
    expect(dataset.rooms.filter((room) => room.occupancy === 'OCCUPIED')).toHaveLength(2)
    expect(dataset.rooms.filter((room) => room.occupancy === 'VACANT')).toHaveLength(8)
    expect(dataset.buildings).toHaveLength(2)
  })

  it('uses the supplied room areas and canonical type semantics', () => {
    const byId = Object.fromEntries(dataset.rooms.map((room) => [room.display_id, room]))
    expect(dataset.rooms.reduce((total, room) => total + Number(room.area_m2), 0)).toBe(270)
    expect(dataset.rooms.filter((room) => room.room_type === 'Studio')).toHaveLength(9)
    expect(byId['BR•04']?.room_type).toBe('Executive studio')
    expect(dataset.rooms.reduce((total, room) => total + Number(room.area_m2) * 6500, 0)).toBe(1755000)
  })

  it('preserves every declared exception without inventing rent or tenancy data', () => {
    const byId = Object.fromEntries(dataset.rooms.map((room) => [room.display_id, room]))
    expect(byId['BR•04'].overrides).toMatchObject({ sofa_bed: true, dedicated_work_desk: true, kitchen: 'FULL', induction_cooker: true, dining_seats: 3 })
    expect(byId['BR•27'].overrides).toMatchObject({ sofa_bed: true, kitchen: 'FULL', induction_cooker: true })
    expect(byId['BR•32'].overrides.indoor_veranda).toBe(true)
    expect(byId['BR•07'].overrides.quiet_room).toBe(true)
    expect(byId['BR•09'].overrides.quiet_room).toBe(true)
    expect(dataset.rooms.every((room) => !('rent' in room) && !('tenant' in room) && !('contract' in room))).toBe(true)
  })

  it('applies the new migration cleanly on the complete RC schema', () => {
    const db = new DatabaseSync(':memory:')
    for (const file of readdirSync('db/migrations-rc').filter((file) => file.endsWith('.sql')).sort()) db.exec(readFileSync(`db/migrations-rc/${file}`, 'utf8'))
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('buildings','room_buildings','room_attribute_definitions','room_attribute_values','room_import_conflicts') ORDER BY name").all().map((row: any) => row.name)
    expect(tables).toEqual(['buildings', 'room_attribute_definitions', 'room_attribute_values', 'room_buildings', 'room_import_conflicts'])
    expect((db.prepare("SELECT sql FROM sqlite_master WHERE name='room_import_conflicts'").get() as { sql?: string } | undefined)?.sql).toContain('NORMALIZED_CANONICAL')
    db.close()
  })
})
