import { describe, expect, it } from 'vitest'
import { chooseBranch, distanceKm } from '../../apps/worker/src/pizzetta-assignment'

const branches = [
  { id: 'branch-poblacion', name: 'Pobla', latitude: 14.5657, longitude: 121.0286, wait_minutes: 18, orders_paused: 0 },
  { id: 'branch-antipolo', name: 'Antipolo', latitude: 14.5846, longitude: 121.1765, wait_minutes: 10, orders_paused: 0 },
  { id: 'branch-bf-homes', name: 'BF Homes', latitude: 14.4635, longitude: 121.0268, wait_minutes: 12, orders_paused: 1 },
]

describe('P2 automatic branch assignment', () => {
  it('selects the nearest open branch from GPS coordinates', () => {
    const selected = chooseBranch({ latitude: 14.566, longitude: 121.029 }, branches)
    expect(selected.id).toBe('branch-poblacion')
    expect(selected.assignment_reason).toBe('nearest_open_branch')
  })

  it('never selects a paused branch and uses lowest wait without GPS', () => {
    const selected = chooseBranch({}, branches)
    expect(selected.id).toBe('branch-antipolo')
    expect(selected.assignment_reason).toBe('lowest_wait_open_branch')
  })

  it('fails closed when all branches are paused', () => {
    expect(() => chooseBranch({}, branches.map(branch => ({ ...branch, orders_paused: 1 })))).toThrow('temporarily paused')
  })

  it('calculates a positive distance', () => {
    expect(distanceKm(branches[0], branches[1])).toBeGreaterThan(0)
  })
})
