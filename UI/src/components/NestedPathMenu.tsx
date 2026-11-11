import { useState, type ReactNode } from 'react';

export type NestedPathNode = { id: string; label: string; children?: NestedPathNode[] };
type NestedPathMenuProps = { ariaLabel: string; nodes: NestedPathNode[]; initialOpenPath?: string[]; onLeafOpen?: (node: NestedPathNode, path: string[]) => void; renderLeaf?: (node: NestedPathNode, path: string[]) => ReactNode; renderAction?: (node: NestedPathNode, path: string[], isOpen: boolean) => ReactNode; renderNodeContent?: (node: NestedPathNode, path: string[], isOpen: boolean) => ReactNode };

export function NestedPathMenu({ ariaLabel, nodes, initialOpenPath = [], onLeafOpen, renderLeaf, renderAction, renderNodeContent }: NestedPathMenuProps) {
  const [openPath, setOpenPath] = useState<string[]>(initialOpenPath);

  const renderNodes = (items: NestedPathNode[], parentPath: string[]) => <div className="nested-path-level">{items.map((node) => {
    const path = [...parentPath, node.id];
    const isOpen = path.every((id, index) => openPath[index] === id);
    const hasChildren = Boolean(node.children?.length);
    return <div className={`nested-path-node${isOpen ? ' is-open' : ''}`} data-depth={parentPath.length} key={node.id}>
      <div className="nested-path-heading"><button aria-expanded={hasChildren ? isOpen : undefined} className="nested-path-trigger" onClick={() => { setOpenPath(isOpen ? parentPath : path); if (!hasChildren) onLeafOpen?.(node, path); }} type="button">{node.label}</button>{renderAction?.(node, path, isOpen)}</div>
      {renderNodeContent?.(node, path, isOpen)}
      {isOpen && hasChildren && renderNodes(node.children ?? [], path)}
      {isOpen && !hasChildren && renderLeaf?.(node, path)}
    </div>;
  })}</div>;

  return <div aria-label={ariaLabel} className="nested-path-menu">{renderNodes(nodes, [])}</div>;
}
