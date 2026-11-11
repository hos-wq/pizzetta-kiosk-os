import { useId, type InputHTMLAttributes } from 'react';

type PickerProps = { label: string; value: string; onChange: (value: string) => void; disabled?: boolean };

function NativePicker({ label, value, onChange, disabled = false, type, id, ...props }: PickerProps & { type: 'date' | 'time'; id: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'disabled' | 'id' | 'onChange' | 'type' | 'value'>) {
  return <div className="native-picker">
    <label className="date-time-label field-label" htmlFor={id}>{label}</label>
    <input {...props} aria-label={label} className="native-picker-input" disabled={disabled} id={id} onChange={(event) => onChange(event.target.value)} type={type} value={value} />
  </div>;
}

export function DateField({ label, value, onChange, disabled = false }: PickerProps) { const id = `g2-date-field-${useId().replaceAll(':', '')}`; return <NativePicker disabled={disabled} id={id} label={label} onChange={onChange} type="date" value={value} />; }
export function TimeField({ label, value, onChange, disabled = false }: PickerProps) { const id = `g2-time-field-${useId().replaceAll(':', '')}`; return <NativePicker disabled={disabled} id={id} label={label} onChange={onChange} type="time" value={value} />; }
