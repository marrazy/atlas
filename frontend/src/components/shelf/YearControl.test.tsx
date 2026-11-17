import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YearControl } from './YearControl'

/** Holds the year like the page does, so playing moves through the years. */
function Harness({ start = 2025, onYearChange = () => {} }: { start?: number; onYearChange?: (year: number) => void }) {
  const [year, setYear] = useState(start)
  return (
    <YearControl
      year={year}
      min={1971}
      max={2025}
      producing={year - 1900}
      onYearChange={(y) => {
        onYearChange(y)
        setYear(y)
      }}
    />
  )
}

const slider = () => screen.getByRole('slider', { name: 'Year' })
const step = () => act(() => vi.advanceTimersByTime(220))

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('YearControl', () => {
  it('is a labelled slider from the first to the last year', () => {
    render(<Harness />)
    expect(slider()).toHaveAttribute('min', '1971')
    expect(slider()).toHaveAttribute('max', '2025')
    expect(slider()).toHaveValue('2025')
  })

  it('changes the year when the slider moves', () => {
    const onYearChange = vi.fn()
    render(<Harness onYearChange={onYearChange} />)
    fireEvent.change(slider(), { target: { value: '1990' } })
    expect(onYearChange).toHaveBeenCalledWith(1990)
    expect(slider()).toHaveValue('1990')
  })

  it('says how many fields had production in the year', () => {
    render(<YearControl year={1990} min={1971} max={2025} producing={24} onYearChange={() => {}} />)
    expect(screen.getByText('24 fields had production in 1990.')).toBeInTheDocument()
  })

  it('writes "1 field", not "1 fields" (Ekofisk alone in 1971)', () => {
    render(<YearControl year={1971} min={1971} max={2025} producing={1} onYearChange={() => {}} />)
    expect(screen.getByText('1 field had production in 1971.')).toBeInTheDocument()
  })

  it('says when producing fields are not on the map, and says nothing when all are', () => {
    const { rerender } = render(<YearControl year={2025} min={1971} max={2025} producing={95} notMapped={1} onYearChange={() => {}} />)
    expect(
      screen.getByText('95 fields had production in 2025. 1 of them has no location in the data, so it is not on the map.'),
    ).toBeInTheDocument()
    rerender(<YearControl year={2025} min={1971} max={2025} producing={95} notMapped={2} onYearChange={() => {}} />)
    expect(screen.getByText(/2 of them have no location in the data, so they are not on the map\.$/)).toBeInTheDocument()
    rerender(<YearControl year={2025} min={1971} max={2025} producing={95} onYearChange={() => {}} />)
    expect(screen.getByText('95 fields had production in 2025.')).toBeInTheDocument()
  })

  it('starts again from the first year when play is pressed at the last year, then steps one year at a time', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Play through the years' }))
    expect(slider()).toHaveValue('1971')
    step()
    expect(slider()).toHaveValue('1972')
    step()
    expect(slider()).toHaveValue('1973')
  })

  it('stops by itself at the last year', () => {
    render(<Harness start={2023} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play through the years' }))
    step()
    step()
    expect(slider()).toHaveValue('2025')
    step()
    expect(slider()).toHaveValue('2025')
    expect(screen.getByRole('button', { name: 'Play through the years' })).toBeInTheDocument()
  })

  it('pauses with the same button', () => {
    render(<Harness start={2000} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play through the years' }))
    step()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    step()
    expect(slider()).toHaveValue('2001')
  })

  it('stops playing when the slider is moved by hand', () => {
    render(<Harness start={2000} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play through the years' }))
    fireEvent.change(slider(), { target: { value: '1980' } })
    step()
    expect(slider()).toHaveValue('1980')
    expect(screen.getByRole('button', { name: 'Play through the years' })).toBeInTheDocument()
  })

  it('keeps screen readers quiet while playing, and reads the count when paused', () => {
    render(<Harness start={2000} />)
    const count = screen.getByText('100 fields had production in 2000.')
    expect(count).toHaveAttribute('aria-live', 'polite')
    fireEvent.click(screen.getByRole('button', { name: 'Play through the years' }))
    expect(count).toHaveAttribute('aria-live', 'off')
  })
})
