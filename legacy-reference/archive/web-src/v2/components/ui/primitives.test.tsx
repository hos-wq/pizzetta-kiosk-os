import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ActionButton, Checkbox, Radio, SearchField, SegmentedControl, ToggleSwitch, UniversalField } from './primitives'
import { DateWheelPicker, TimeWheelPicker } from './WheelPicker'

describe('BR OS universal UI primitives', () => {
  it('keeps the universal field grammar for text, select and multiline values', () => {
    render(<><UniversalField label="Name" value="Maria Santos" readOnly /><UniversalField label="Type" kind="select" value="VIEWING" options={[{ value: 'VIEWING', label: 'Viewing' }]} /><UniversalField label="Message" kind="textarea" value="Please confirm" onChange={vi.fn()} /></>)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Maria Santos')).toHaveClass('br-universal-field-control')
    expect(screen.getByDisplayValue('Viewing')).toHaveClass('br-universal-field-control')
    expect(screen.getByDisplayValue('Please confirm')).toHaveClass('br-universal-field-control')
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
  })

  it('provides the shared People search field with a single accessible control', () => {
    const onChange = vi.fn()
    render(<SearchField value="Maria" onChange={onChange} placeholder="Search name" />)
    const input = screen.getByRole('textbox', { name: 'Search' })
    expect(input).toHaveValue('Maria')
    fireEvent.change(input, { target: { value: 'Mara' } })
    expect(onChange).toHaveBeenCalledWith('Mara')
    expect(input.closest('.br-search-field')).toBeInTheDocument()
  })

  it('supports touch and keyboard activation with accessible state', () => {
    const onToggle = vi.fn(); const onCheck = vi.fn(); const onSegment = vi.fn()
    render(<><ToggleSwitch label="Bot replies" checked={false} onChange={onToggle} /><Checkbox label="Visible" checked={false} onChange={onCheck} /><SegmentedControl value="ALL" onChange={onSegment} options={[{ value: 'ALL', label: 'All' }, { value: 'OPEN', label: 'Open' }]} /></>)
    const toggle = screen.getByRole('switch', { name: 'Bot replies' }); toggle.focus(); expect(document.activeElement).toBe(toggle); fireEvent.click(toggle); expect(onToggle).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Visible' })); expect(onCheck).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByRole('button', { name: 'Open' })); expect(onSegment).toHaveBeenCalledWith('OPEN')
  })

  it('keeps ordinary actions on the shared Brass action primitive', () => {
    render(<ActionButton>Confirm</ActionButton>)
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveAttribute('data-variant', 'primary')
  })

  it('exposes mutually exclusive radio options', () => {
    render(<><Radio label="Viewing" name="kind" value="VIEWING" checked onChange={vi.fn()} /><Radio label="Tenancy" name="kind" value="TENANCY" checked={false} onChange={vi.fn()} /></>)
    expect(screen.getByRole('radio', { name: 'Viewing' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Tenancy' })).not.toBeChecked()
  })

  it('handles leap-day date wheels and month-length changes', () => {
    const onChange = vi.fn()
    render(<DateWheelPicker value="2024-02-29" onChange={onChange} />)
    expect(screen.getByRole('option', { name: '29' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'Mar' }))
    expect(onChange).toHaveBeenCalledWith('2024-03-29')
  })

  it('handles 11:59 AM/PM boundaries through the time wheel', () => {
    const onChange = vi.fn()
    const { rerender } = render(<TimeWheelPicker value="11:59" onChange={onChange} />)
    fireEvent.click(screen.getByRole('option', { name: 'PM' }))
    expect(onChange).toHaveBeenCalledWith('23:59')
    rerender(<TimeWheelPicker value="23:59" onChange={onChange} />)
    fireEvent.click(screen.getByRole('option', { name: 'AM' }))
    expect(onChange).toHaveBeenLastCalledWith('11:59')
  })
})
