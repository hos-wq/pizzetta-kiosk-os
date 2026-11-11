export type OperationalCatalogNode = { id: string; service_type: 'MAINTENANCE' | 'HOUSEKEEPING'; level: 'MACRO' | 'CATEGORY' | 'OBJECT' | 'ACTION'; parent_id: string | null; node_key: string; label: string }
export type OperationalPathNode = { id: string; label: string; children?: OperationalPathNode[] }

export function buildServiceTree(nodes: readonly OperationalCatalogNode[]): OperationalPathNode[] {
  const byParent = new Map<string | null, OperationalCatalogNode[]>()
  for (const node of nodes) byParent.set(node.parent_id, [...(byParent.get(node.parent_id) ?? []), node])
  const branch = (parentId: string | null): OperationalPathNode[] => (byParent.get(parentId) ?? []).map((node) => ({ id: node.id, label: node.label, children: branch(node.id) }))
  const roots = branch(null)
  return [{ id: 'service', label: 'SERVICE', children: (['MAINTENANCE', 'HOUSEKEEPING'] as const).map((type) => ({ id: type, label: type, children: roots.filter((node) => nodes.find((item) => item.id === node.id)?.service_type === type) })) }]
}
