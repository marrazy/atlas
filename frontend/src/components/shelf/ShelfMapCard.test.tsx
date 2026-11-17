import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { FieldSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { fields } from '@/test/fixtures'
import { ShelfMapCard } from './ShelfMapCard'

const renderCard = (state: ApiState<FieldSummary[]>) =>
  render(
    <MemoryRouter>
      <ShelfMapCard fields={state} />
    </MemoryRouter>,
  )

describe('ShelfMapCard', () => {
  it('describes only what the map shows, from the data', () => {
    renderCard({ status: 'ready', data: fields })
    expect(screen.getByRole('heading', { level: 2, name: 'Fields on the shelf' })).toBeInTheDocument()
    expect(screen.getByText('Each field is a circle at the centre of its outline. Click a field to open its deep dive.')).toBeInTheDocument()
  })

  it('explains colour and shape in words, so colour is not the only clue', () => {
    renderCard({ status: 'ready', data: fields })
    for (const text of ['Mostly oil', 'Mostly gas', 'Shut down (ring)', 'No production yet (faint ring)', 'Circle size shows total production to date.']) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })

  it('loads the map once the fields are ready', async () => {
    renderCard({ status: 'ready', data: fields })
    expect(await screen.findByRole('button', { name: 'Zoom in' })).toBeInTheDocument()
  })

  it('shows the error when the fields could not load', () => {
    renderCard({ status: 'error', message: 'Could not reach the server.' })
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.')
    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument()
  })
})
