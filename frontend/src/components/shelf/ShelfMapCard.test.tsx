import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { FieldSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { fields } from '@/test/fixtures'
import { ShelfMapCard } from './ShelfMapCard'

const renderCard = (state: ApiState<FieldSummary[]>, year: number | null = 2025) =>
  render(
    <MemoryRouter>
      <ShelfMapCard fields={state} year={year} range={year === null ? null : [2008, 2025]} onYearChange={() => {}} />
    </MemoryRouter>,
  )

describe('ShelfMapCard', () => {
  it('describes only what the map shows, from the data', () => {
    renderCard({ status: 'ready', data: fields })
    expect(screen.getByRole('heading', { level: 2, name: 'Fields on the shelf' })).toBeInTheDocument()
    expect(screen.getByText('Each field is a circle at the centre of its outline. Drag the year or press play to see which fields were producing. Click a field to open its deep dive.',)).toBeInTheDocument()
  })

  it('explains colour and shape in words, so colour is not the only clue', () => {
    renderCard({ status: 'ready', data: fields })
    for (const text of [
      'Mostly oil',
      'Mostly gas',
      'Filled: produced that year',
      'Ring: had stopped',
      'Faint ring: not started yet',
      'Circle size shows total production to date.',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })

  it('loads the map once the fields are ready', async () => {
    renderCard({ status: 'ready', data: fields })
    expect(await screen.findByRole('button', { name: 'Zoom in' })).toBeInTheDocument()
  })

  it('shows the year slider with the count for the year, and says why Sindre has no circle', () => {
    renderCard({ status: 'ready', data: fields })
    expect(screen.getByRole('slider', { name: 'Year' })).toHaveValue('2025')
    expect(
      screen.getByText('1 field had production in 2025. 1 of them has no location in the data, so it is not on the map.'),
    ).toBeInTheDocument()
  })

  it('waits for the year range before showing the map or the slider', () => {
    renderCard({ status: 'ready', data: fields }, null)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument()
  })

  it('shows the error when the fields could not load', () => {
    renderCard({ status: 'error', message: 'Could not reach the server.' })
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.')
    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument()
  })
})
