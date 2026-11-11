import type { ChangeEvent } from 'react';
import { Icon } from './Icon';

type ToggleProps = { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean };
type CheckboxProps = ToggleProps & { error?: string };

export function Toggle({ label, checked, onChange, disabled = false }: ToggleProps) {
  return <label className={`toggle-control${disabled ? ' is-disabled' : ''}`}><input aria-label={label} checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} role="switch" type="checkbox" /><span aria-hidden="true" className="toggle-track"><span className="toggle-thumb" /></span><span className="toggle-label">{label}</span></label>;
}

export function Checkbox({ label, checked, onChange, disabled = false, error }: CheckboxProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked);
  const className = ['checkbox-control', disabled ? 'is-disabled' : '', error ? 'is-invalid' : ''].filter(Boolean).join(' ');
  return <label className={className}>
    <input aria-label={label} checked={checked} disabled={disabled} onChange={handleChange} type="checkbox" />
    <span className="checkbox-mark" aria-hidden="true">{checked && <Icon name="check" />}</span>
    <span>{label}</span>
    {error && <span className="checkbox-error" role="alert">{error}</span>}
  </label>;
}
