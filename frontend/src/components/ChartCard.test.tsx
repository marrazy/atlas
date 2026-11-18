import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartCard } from './ChartCard'

describe('ChartCard', () => {
  it('says "Loading" to screen readers and marks itself busy while its data loads', () => {
    render(
      <ChartCard title="Shelf production by year" busy>
        <div />
      </ChartCard>,
    )
    const card = screen.getByRole('heading', { name: 'Shelf production by year' }).closest('section')!
    expect(card).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Loading')).toHaveClass('sr-only')
  })

  it('drops both once the data is there', () => {
    render(
      <ChartCard title="Shelf production by year">
        <div />
      </ChartCard>,
    )
    const card = screen.getByRole('heading', { name: 'Shelf production by year' }).closest('section')!
    expect(card).toHaveAttribute('aria-busy', 'false')
    expect(screen.queryByText('Loading')).not.toBeInTheDocument()
  })
})
