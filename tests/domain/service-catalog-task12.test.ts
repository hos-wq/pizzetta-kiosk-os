import { describe, expect, it } from 'vitest'
import { SERVICE_CATALOG_SEED, expandedCatalog } from '../../apps/worker/src/service-catalog'

describe('Task 12 service catalog', () => {
  const nodes = expandedCatalog()

  it('contains the complete frozen hierarchy with stable unique identifiers', () => {
    expect(SERVICE_CATALOG_SEED).toHaveLength(112)
    expect(new Set(nodes.map(node => node.id)).size).toBe(nodes.length)
    expect(nodes.filter(node => node.level === 'MACRO')).toHaveLength(4)
    expect(nodes.filter(node => node.level === 'CATEGORY')).toHaveLength(24)
    expect(nodes.filter(node => node.level === 'OBJECT')).toHaveLength(112)
    expect(nodes.filter(node => node.level === 'ACTION')).toHaveLength(252)
    expect(nodes).toHaveLength(392)
  })

  it('preserves service and parent boundaries, including repeated object names', () => {
    for (const node of nodes) {
      if (node.level === 'MACRO') expect(node.parent_id).toBeNull()
      else expect(node.parent_id).not.toBeNull()
      if (node.parent_id) expect(nodes.some(parent => parent.id === node.parent_id)).toBe(true)
    }
    const sinks = nodes.filter(node => node.level === 'OBJECT' && node.label === 'SINK')
    expect(sinks.length).toBeGreaterThan(1)
    expect(new Set(sinks.map(node => node.id)).size).toBe(sinks.length)
  })

  it('keeps actions scoped to their object branch', () => {
    const faucet = nodes.find(node => node.level === 'OBJECT' && node.label === 'FAUCET')
    expect(faucet).toBeDefined()
    const actions = nodes.filter(node => node.level === 'ACTION' && node.parent_id === faucet?.id).map(node => node.label)
    expect(actions).toEqual(['FIX LEAK', 'REPAIR', 'REPLACE'])
    expect(nodes.some(node => node.level === 'ACTION' && node.label === 'UNCLOG' && node.parent_id === faucet?.id)).toBe(false)
  })
})
