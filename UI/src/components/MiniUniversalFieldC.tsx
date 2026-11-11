import { useState } from 'react';
import { CreateAction } from './CreateAction';

export type MiniCategory = { name: string; options: string[] };
type MiniUniversalFieldCProps = { categories: MiniCategory[]; onAddCategory: () => void };

export function MiniUniversalFieldC({ categories, onAddCategory }: MiniUniversalFieldCProps) {
  const [expanded, setExpanded] = useState<string | null>(categories[0]?.name ?? null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const choose = (category: MiniCategory, option: string) => { setSelected((current) => ({ ...current, [category.name]: option })); setExpanded(null); };

  return <div className="mini-field-c" aria-label="Room category selector">
    <div className="mini-field-header"><span className="field-label">CATEGORIES</span><CreateAction label="Add category" onClick={onAddCategory} /></div>
    <div className="mini-chip-list">{categories.map((category) => {
      const isExpanded = expanded === category.name;
      const choice = selected[category.name];
      return <div className="mini-category" key={category.name}>
        <button aria-expanded={isExpanded} className={`mini-chip${choice ? ' has-value' : ''}${isExpanded ? ' is-expanded' : ''}`} onClick={() => setExpanded(isExpanded ? null : category.name)} type="button"><span>{choice ?? category.name}</span></button>
        {isExpanded && <div className="mini-options" role="group" aria-label={`${category.name} options`}>{category.options.map((option) => <button className="mini-option" key={option} onClick={() => choose(category, option)} type="button">{option}</button>)}</div>}
      </div>;
    })}</div>
  </div>;
}
