import { Search } from 'lucide-react'
import { useCallback, useLayoutEffect, useRef, useState, type ChangeEvent, type HTMLAttributes, type ReactNode } from 'react'

/* The callback ref is intentionally attached to the native control so the adaptive measurement can observe its rendered width. */
/* eslint-disable react-hooks/refs */

function useAdaptiveFontSize(value: string, min = 9, max = 13) {
  const elementRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)
  const [elementVersion, setElementVersion] = useState(0)
  const attach = useCallback((node: HTMLInputElement | HTMLSelectElement | null) => { elementRef.current = node; setElementVersion(version => version + 1) }, [])
  const [fontSize, setFontSize] = useState(max)
  useLayoutEffect(() => {
    const element = elementRef.current
    if (!element) return
    const fit = () => {
      let next = max
      element.setAttribute('style', `font-size: ${next}px`)
      while (element.scrollWidth > element.clientWidth + 1 && next > min) {
        next -= 0.5
        element.setAttribute('style', `font-size: ${next}px`)
      }
      setFontSize(next)
    }
    fit()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit)
    observer?.observe(element)
    return () => observer?.disconnect()
  }, [elementVersion, value, min, max])
  return { attach, style: { fontSize } }
}

type BaseFieldProps = {
  label: string
  value: string
  id?: string
  name?: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  onClick?: () => void
  onChange?: (value: string) => void
}

type UniversalFieldProps = BaseFieldProps & ({ kind?: 'text' | 'tel' | 'email' | 'number' | 'date' | 'time'; inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'] } | { kind: 'textarea'; rows?: number } | { kind: 'select'; options: { value: string; label: string }[] })

export function UniversalField(props: UniversalFieldProps) {
  const { label, value, id, name, placeholder, disabled = false, readOnly = false, onChange, onClick } = props
  const controlId = id ?? name ?? `br-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => onChange?.(event.target.value)
  const common = { id: controlId, name, value, placeholder, disabled, onChange: handleChange, className: 'br-universal-field-control' }
  const adaptive = useAdaptiveFontSize(value)
  return <label className={`br-universal-field${disabled ? ' is-disabled' : ''}`} htmlFor={controlId}><span>{label}</span>{props.kind === 'textarea' ? <textarea {...common} onClick={onClick} readOnly={readOnly} rows={props.rows ?? 3} /> : props.kind === 'select' ? <select {...common} onClick={onClick} ref={adaptive.attach} style={adaptive.style}>{props.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input {...common} onClick={onClick} ref={adaptive.attach} style={adaptive.style} readOnly={readOnly} type={props.kind ?? 'text'} inputMode={'inputMode' in props ? props.inputMode : undefined} />}</label>
}

export function ActionButton({ children, variant = 'primary', disabled = false, onClick, type = 'button' }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'text'; disabled?: boolean; onClick?: () => void; type?: 'button' | 'submit' | 'reset' }) {
  return <button type={type} className="br-action-button" data-variant={variant} disabled={disabled} onClick={onClick}>{children}</button>
}

export function SearchField({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="br-search-field"><Search aria-hidden="true" size={16} /><input aria-label="Search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>
}

export function Checkbox({ label, checked, onChange, disabled = false }: { label: ReactNode; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return <label className="br-control-label"><input className="br-control" type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><span className="br-control-visual" aria-hidden="true">{checked ? '✓' : ''}</span><span>{label}</span></label>
}

export function Radio({ label, checked, name, value, onChange, disabled = false }: { label: ReactNode; checked: boolean; name: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="br-control-label br-radio"><input className="br-control" type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={event => onChange(event.target.value)} /><span className="br-control-visual" aria-hidden="true" /><span>{label}</span></label>
}

export function SegmentedControl({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  return <div className="br-segmented-control" role="group">{options.map(option => <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>
}

export function ToggleSwitch({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" className="br-toggle-switch" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}><span /></button>
}
/* eslint-enable react-hooks/refs */
