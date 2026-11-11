import type { CSSProperties } from 'react';

type ContextTabsProps = { active: string; ariaLabel: string; labels: string[]; onChange: (label: string) => void };

export function ContextTabs({ active, ariaLabel, labels, onChange }: ContextTabsProps) {
  return <div aria-label={ariaLabel} className="context-tabs" role="tablist" style={{ '--br-tab-count': labels.length } as CSSProperties}>{labels.map((label) => <button aria-selected={active === label} className={`br-navigation-tile context-tab${active === label ? ' is-active' : ''}`} key={label} onClick={() => onChange(label)} role="tab" type="button"><span className="context-tab-label">{label}</span></button>)}</div>;
}
