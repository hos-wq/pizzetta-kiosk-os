import type { ReactNode } from 'react'

export type LabelKind = 'PERSON' | 'ROOM' | 'VIEWING' | 'MAINTENANCE' | 'TENANCY' | 'CHANNEL' | 'STATE' | 'ACTION' | 'DATE' | 'TIME' | 'PRIORITY'

export function EntityLabel({ kind, children, onClick, title }: { kind: LabelKind; children: unknown; onClick?: () => void; title?: string }) {
  const className = `v2-typed-label v2-typed-label-${kind.toLowerCase()}`
  if (onClick) return <button type="button" className={className} onClick={onClick} title={title}>{String(children)}</button>
  return <span className={className} title={title}>{String(children)}</span>
}

export function DateLabel({ children }: { children: ReactNode }) { return <EntityLabel kind="DATE">{children}</EntityLabel> }
export function TimeLabel({ children }: { children: ReactNode }) { return <EntityLabel kind="TIME">{children}</EntityLabel> }
export function PriorityLabel({ children }: { children: ReactNode }) { return <EntityLabel kind="PRIORITY">{children}</EntityLabel> }
