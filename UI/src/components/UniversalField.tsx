import { useId, useLayoutEffect, useRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';

type UniversalFieldProps = {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  selected?: boolean;
  placeholder?: string;
  leadingIcon?: ReactNode;
  trailingAction?: ReactNode;
  onValueClick?: () => void;
  name?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  multiline?: boolean;
  className?: string;
};

export function UniversalField({ label, value, onChange, onValueClick, readOnly = false, disabled = false, required = false, error, selected = false, placeholder, leadingIcon, trailingAction, name, inputMode, multiline = false, className = '' }: UniversalFieldProps) {
  const descriptionId = `${name ?? label.toLowerCase().replaceAll(' ', '-')}-description`;
  const errorId = `${descriptionId}-error`;
  const generatedId = `br-field-${useId().replaceAll(':', '')}`;
  const fieldId = name ?? generatedId;
  const multilineRef = useRef<HTMLTextAreaElement>(null);
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value);
  const handleMultilineChange = (event: ChangeEvent<HTMLTextAreaElement>) => onChange?.(event.target.value);

  useLayoutEffect(() => {
    if (!multiline || !multilineRef.current) return;
    multilineRef.current.style.height = 'auto';
    multilineRef.current.style.height = `${multilineRef.current.scrollHeight}px`;
  }, [multiline, value]);

  return (
    <div className={`universal-field${selected ? ' is-selected' : ''}${error ? ' is-invalid' : ''}${className ? ` ${className}` : ''}`}>
      <div className="field-main">
        <label className="field-label br-theme-label" htmlFor={fieldId}>{leadingIcon}<span>{label}</span>{required && <span aria-hidden="true">*</span>}</label>
        {multiline ? <textarea aria-describedby={error ? errorId : descriptionId} aria-invalid={error ? true : undefined} className="field-input field-input-multiline" disabled={disabled} id={fieldId} name={name} onChange={handleMultilineChange} onClick={onValueClick} placeholder={placeholder} readOnly={readOnly} ref={multilineRef} rows={2} value={value} /> : <input aria-describedby={error ? errorId : descriptionId} aria-invalid={error ? true : undefined} className="field-input" disabled={disabled} id={fieldId} inputMode={inputMode} name={name} onChange={handleChange} onClick={onValueClick} placeholder={placeholder} readOnly={readOnly} value={value} />}
      </div>
      {trailingAction}
      <span className="field-sr-only" id={descriptionId}>{readOnly ? 'Read-only value.' : 'Editable value.'}</span>
      {error && <span className="field-error" id={errorId} role="alert">{error}</span>}
    </div>
  );
}
