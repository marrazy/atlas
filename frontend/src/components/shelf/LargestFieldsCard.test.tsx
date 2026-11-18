import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { FieldSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { fields } from '@/test/fixtures'
import { LargestFieldsCard } from './LargestFieldsCard'

function show(state: ApiState<FieldSummary[]>, until: string | null = 'August 2026') {
  return render(
    <MemoryRouter>
      <LargestFieldsCard fields={state} until={until} />
    </MemoryRouter>,
  )
}

const cells = (row: HTMLElement) => within(row).getAllByRole('cell').map((c) => c.textContent)

describe('LargestFieldsCard', () => {
  it('lists the fields with the most production, with their numbers from the API', () => {
    show({ status: 'ready', data: fields })
    const rows = screen.getAllByRole('row')
    expect(within(rows[0]).getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'Field',
      'Main product',
      'First production',
      'Operator',
      'Million Sm³ o.e.',
    ])
    // Berling has never produced, so it is not in the table
    expect(rows).toHaveLength(3)
    expect(cells(rows[1])).toEqual(['Volve', 'Oil', '2008', 'Equinor', '11'])
    expect(cells(rows[2])).toEqual(['Sindre', 'Gas', '2017', 'Equinor', '0'])
  })

  it('links each field name to its deep dive', () => {
    show({ status: 'ready', data: fields })
    expect(screen.getByRole('link', { name: 'Volve' })).toHaveAttribute('href', '/fields/3420717')
  })

  it('says how far the totals go, from the snapshot month', () => {
    show({ status: 'ready', data: fields })
    expect(screen.getByText('By total saleable production, up to August 2026.')).toBeInTheDocument()
  })

  it('leaves the month out until the snapshot has loaded', () => {
    show({ status: 'ready', data: fields }, null)
    expect(screen.getByText('By total saleable production.')).toBeInTheDocument()
  })

  it('says so when a field has no operator in the data', () => {
    show({ status: 'ready', data: [{ ...fields[0], operator: null }] })
    expect(cells(screen.getAllByRole('row')[1])[3]).toBe('Not in the data')
  })

  it('has a caption for screen readers that names the unit', () => {
    show({ status: 'ready', data: fields })
    expect(screen.getByRole('table', { name: /largest fields by total saleable production, in million Sm³/ })).toBeInTheDocument()
  })

  it('shows placeholders while loading and the error message when loading fails', () => {
    const { rerender } = show({ status: 'loading' })
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    rerender(
      <MemoryRouter>
        <LargestFieldsCard fields={{ status: 'error', message: 'Database is down.' }} until={null} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Database is down.')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
