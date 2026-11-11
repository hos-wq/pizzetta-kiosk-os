import { describe, expect, it } from 'vitest'
import { buildServiceTree, type OperationalCatalogNode } from '../../apps/web/src/integration/service-hierarchy'

const node = (id: string, service_type: OperationalCatalogNode['service_type'], level: OperationalCatalogNode['level'], parent_id: string | null, label: string): OperationalCatalogNode => ({ id, service_type, level, parent_id, node_key: id, label })

describe('operational service hierarchy', () => {
  it('preserves ROOM context and nests SERVICE through ACTION', () => {
    const tree = buildServiceTree([
      node('maintenance-macro', 'MAINTENANCE', 'MACRO', null, 'ORDINARY'),
      node('maintenance-category', 'MAINTENANCE', 'CATEGORY', 'maintenance-macro', 'PLUMBING'),
      node('maintenance-object', 'MAINTENANCE', 'OBJECT', 'maintenance-category', 'FAUCET'),
      node('maintenance-action', 'MAINTENANCE', 'ACTION', 'maintenance-object', 'REPAIR'),
      node('housekeeping-macro', 'HOUSEKEEPING', 'MACRO', null, 'REGULAR'),
      node('housekeeping-category', 'HOUSEKEEPING', 'CATEGORY', 'housekeeping-macro', 'BATHROOM'),
      node('housekeeping-object', 'HOUSEKEEPING', 'OBJECT', 'housekeeping-category', 'SINK'),
      node('housekeeping-action', 'HOUSEKEEPING', 'ACTION', 'housekeeping-object', 'CLEAN'),
    ])
    expect(tree[0]?.label).toBe('SERVICE')
    expect(tree[0]?.children?.map((item) => item.label)).toEqual(['MAINTENANCE', 'HOUSEKEEPING'])
    expect(tree[0]?.children?.[0]?.children?.[0]?.children?.[0]?.children?.[0]?.children?.[0]?.label).toBe('REPAIR')
    expect(tree[0]?.children?.[1]?.children?.[0]?.children?.[0]?.children?.[0]?.children?.[0]?.label).toBe('CLEAN')
  })
})
