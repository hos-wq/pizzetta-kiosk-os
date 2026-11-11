import { useId, useState, type ReactNode } from 'react';

type AccordionItem = { id: string; label: string; content: ReactNode };
type UniversalAccordionProps = { items: AccordionItem[]; ariaLabel: string; defaultOpenId?: string };

export function UniversalAccordion({ items, ariaLabel, defaultOpenId }: UniversalAccordionProps) {
  const [openId, setOpenId] = useState(defaultOpenId ?? '');
  return <div aria-label={ariaLabel} className="accordion-group">
    {items.map((item) => <AccordionRow key={item.id} item={item} open={openId === item.id} onToggle={() => setOpenId((current) => current === item.id ? '' : item.id)} />)}
  </div>;
}

function AccordionRow({ item, open, onToggle }: { item: AccordionItem; open: boolean; onToggle: () => void }) {
  const contentId = useId();
  return <section className={'accordion-row' + (open ? ' is-open' : '')}>
    <h3 className="accordion-heading"><button aria-controls={contentId} aria-expanded={open} className="accordion-trigger" onClick={onToggle} type="button">{item.label}<span aria-hidden="true" className="accordion-state">{open ? '−' : '+'}</span></button></h3>
    {open && <div className="accordion-content" id={contentId}>{item.content}</div>}
  </section>;
}
