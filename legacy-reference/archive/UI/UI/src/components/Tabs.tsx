type TabsProps = { labels: string[]; active: string; onChange: (label: string) => void };

export function Tabs({ labels, active, onChange }: TabsProps) {
  return <div className="tabs" role="tablist" aria-label="Gallery tabs">{labels.map((label) => <button aria-selected={label === active} className={`tab${label === active ? ' is-active' : ''}`} key={label} onClick={() => onChange(label)} role="tab" type="button">{label}</button>)}</div>;
}
