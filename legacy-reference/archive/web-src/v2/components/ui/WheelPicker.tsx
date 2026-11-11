import { useEffect, useMemo, useRef } from 'react'

export type WheelOption = { value: string; label: string }

function WheelColumn({ label, options, value, onChange }: { label: string; options: WheelOption[]; value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value))
  useEffect(() => { if (ref.current) ref.current.scrollTop = selectedIndex * 40 }, [selectedIndex])
  const syncFromScroll = () => { const index = Math.max(0, Math.min(options.length - 1, Math.round((ref.current?.scrollTop ?? 0) / 40))); if (options[index]?.value !== value) onChange(options[index].value) }
  return <div className="br-wheel-column"><span className="br-wheel-label">{label}</span><div ref={ref} className="br-wheel-scroll" role="listbox" aria-label={label} tabIndex={0} aria-activedescendant={`wheel-${label}-${value}`} onScroll={syncFromScroll} onKeyDown={event => { const delta = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0; if (!delta) return; event.preventDefault(); onChange(options[Math.max(0, Math.min(options.length - 1, selectedIndex + delta))].value) }}>{options.map(option => <button type="button" role="option" id={`wheel-${label}-${option.value}`} aria-selected={option.value === value} key={option.value} className={option.value === value ? 'is-selected' : ''} onClick={() => onChange(option.value)}>{option.label}</button>)}</div></div>
}

const pad = (value: number) => String(value).padStart(2, '0')
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

export function DateWheelPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [yearText, monthText, dayText] = value.split('-'); const now = new Date(); const year = Number(yearText) || now.getUTCFullYear(); const month = Number(monthText) || now.getUTCMonth() + 1; const day = Number(dayText) || 1
  const years = useMemo(() => Array.from({ length: 21 }, (_, index) => year - 10 + index), [year]); const months = Array.from({ length: 12 }, (_, index) => index + 1); const days = Array.from({ length: daysInMonth(year, month) }, (_, index) => index + 1)
  const update = (nextYear: number, nextMonth: number, nextDay: number) => onChange(`${nextYear}-${pad(nextMonth)}-${pad(Math.min(nextDay, daysInMonth(nextYear, nextMonth)))}`)
  return <div className="br-wheel-picker br-date-wheel" aria-label="Choose date"><WheelColumn label="DAY" options={days.map(option => ({ value: String(option), label: pad(option) }))} value={String(day)} onChange={next => update(year, month, Number(next))} /><WheelColumn label="MONTH" options={months.map(option => ({ value: String(option), label: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'Asia/Manila' }).format(new Date(Date.UTC(2020, option - 1, 1))) }))} value={String(month)} onChange={next => update(year, Number(next), day)} /><WheelColumn label="YEAR" options={years.map(option => ({ value: String(option), label: String(option) }))} value={String(year)} onChange={next => update(Number(next), month, day)} /></div>
}

export function TimeWheelPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [hourText, minuteText] = value.split(':'); const parsedHour = Number(hourText); const hour24 = Number.isFinite(parsedHour) ? parsedHour : 12; const minute = Number(minuteText) || 0; const meridiem = hour24 >= 12 ? 'PM' : 'AM'; const hour12 = hour24 % 12 || 12
  const hours = Array.from({ length: 12 }, (_, index) => index + 1); const minutes = Array.from({ length: 60 }, (_, index) => index)
  const update = (nextHour: number, nextMinute: number, nextMeridiem: string) => { const hour24Value = nextMeridiem === 'AM' ? nextHour % 12 : nextHour % 12 + 12; onChange(`${pad(hour24Value)}:${pad(nextMinute)}`) }
  return <div className="br-wheel-picker br-time-wheel" aria-label="Choose time"><WheelColumn label="HOUR" options={hours.map(option => ({ value: String(option), label: pad(option) }))} value={String(hour12)} onChange={next => update(Number(next), minute, meridiem)} /><WheelColumn label="MIN" options={minutes.map(option => ({ value: String(option), label: pad(option) }))} value={String(minute)} onChange={next => update(hour12, Number(next), meridiem)} /><WheelColumn label="AM/PM" options={['AM', 'PM'].map(option => ({ value: option, label: option }))} value={meridiem} onChange={next => update(hour12, minute, next)} /></div>
}
