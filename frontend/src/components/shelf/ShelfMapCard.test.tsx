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
  it('has a title only, with no description line under it', () => {
    renderCard({ status: 'ready', data: fields })
    const heading = screen.getByRole('heading', { level: 2, name: 'Fields on the shelf' })
    expect(heading.parentElement!.querySelectorAll('p')).toHaveLength(0)
  })

  it('explains colour and shape in words in one legend row, with the circle size note at the right', () => {
    renderCard({ status: 'ready', data: fields })
    for (const text of ['Mostly oil', 'Mostly gas', 'Shut down', 'Circle size shows total production']) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })

  it('loads the map once the fields are ready', async () => {
    renderCard({ status: 'ready', data: fields })
    expect(await screen.findByRole('button', { name: 'Zoom in to the northern North Sea' })).toBeInTheDocument()
  })

  it('shows the year slider with the count of fields producing that year, from producing_years', () => {
    renderCard({ status: 'ready', data: fields })
    expect(screen.getByRole('slider', { name: 'Year' })).toHaveValue('2025')
    // in this test data only Sindre produced in 2025
    expect(screen.getByText(/1 field producing$/)).toBeInTheDocument()
  })

  it('waits for the year range before showing the map or the slider', () => {
    renderCard({ status: 'ready', data: fields }, null)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Zoom in to the northern North Sea' })).not.toBeInTheDocument()
  })

  it('shows the error when the fields could not load', () => {
    renderCard({ status: 'error', message: 'Could not reach the server.' })
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.')
    expect(screen.queryByRole('button', { name: 'Zoom in to the northern North Sea' })).not.toBeInTheDocument()
  })
})
