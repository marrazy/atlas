import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HighlightPicker } from './HighlightPicker'

const options = [
  { id: 1, name: 'Volve' },
  { id: 2, name: 'Troll' },
]

describe('HighlightPicker', () => {
  it('shows one button per field in a group named "Highlight", with the chosen one pressed', () => {
    render(<HighlightPicker options={options} value={1} onChange={() => {}} />)
    expect(screen.getByRole('group', { name: 'Highlight' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volve' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Troll' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('gives the id of the field that was pressed', () => {
    const onChange = vi.fn()
    render(<HighlightPicker options={options} value={1} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Troll' }))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('shows nothing while there are no fields to pick', () => {
    const { container } = render(<HighlightPicker options={[]} value={1} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
