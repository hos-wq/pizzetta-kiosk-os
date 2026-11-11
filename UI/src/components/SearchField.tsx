import { UniversalField } from './UniversalField';
import { Icon } from './Icon';

type SearchFieldProps = { value: string; onChange: (value: string) => void; disabled?: boolean; label?: string; name?: string };

export function SearchField({ value, onChange, disabled = false, label = 'Search', name = 'fixture-search' }: SearchFieldProps) {
  return <UniversalField disabled={disabled} label={label} name={name} onChange={onChange} placeholder="Search people or rooms" trailingAction={value ? <button aria-label="Clear search" className="field-clear" disabled={disabled} onClick={() => onChange('')} type="button"><Icon name="clear" /></button> : undefined} value={value} />;
}
