import { useId } from 'react';
import { Icon } from './Icon';

type SelectFieldProps = { label: string; value: string; options: string[]; onChange: (value: string) => void; disabled?: boolean; error?: string };

export function SelectField({ label, value, options, onChange, disabled = false, error }: SelectFieldProps) {
  const selectId = useId();
  return <div className={`select-field${error ? ' is-invalid' : ''}`}>
    <label className="select-trigger" htmlFor={selectId}>
      <span className="field-label">{label}</span><strong>{value || 'Select'}</strong><Icon name="chevron-down" className="select-chevron" />
      <select aria-invalid={error ? true : undefined} className="select-native" disabled={disabled} id={selectId} onChange={(event) => onChange(event.target.value)} value={value}>
        <option disabled value="">Select</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
    {error && <span className="field-error" role="alert">{error}</span>}
  </div>;
}
