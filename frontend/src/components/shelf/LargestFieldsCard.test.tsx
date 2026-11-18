import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { FieldSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { fields } from '@/test/fixtures'
import { LargestFieldsCard } from './LargestFieldsCard'

function show(state: ApiState<FieldSummary[]>) {
  return render(
    <MemoryRouter>
      <LargestFieldsCard fields={state} />
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
    expect(cells(rows[1])).toEqual(['Volve58°26′N 001°53′E', 'Oil', '2008', 'Equinor', '11'])
    // Sindre has no location in the data, so it has no coordinates
    expect(cells(rows[2])).toEqual(['Sindre', 'Gas', '2017', 'Equinor', '0'])
  })

  it('links each field name to its deep dive', () => {
    show({ status: 'ready', data: fields })
    expect(screen.getByRole('link', { name: 'Volve' })).toHaveAttribute('href', '/fields/3420717')
  })

  it('has a title only, no description line, and shows the main product as a dot and a word, not a pill', () => {
    show({ status: 'ready', data: fields })
    expect(screen.getByRole('heading', { level: 2, name: 'Largest fields' }).parentElement!.querySelectorAll('p')).toHaveLength(0)
    const product = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[1]
    expect(product.querySelector('.bg-oil.rounded-full')).not.toBeNull()
    expect(product.querySelector('[data-slot="badge"]')).toBeNull()
  })

  it('writes coordinates under each field name, in mono', () => {
    show({ status: 'ready', data: fields })
    expect(screen.getByText('58°26′N 001°53′E')).toHaveClass('font-mono', 'text-muted-foreground')
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
        <LargestFieldsCard fields={{ status: 'error', message: 'Database is down.' }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Database is down.')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('hides first production and operator on a phone, so the total stays in view', () => {
    show({ status: 'ready', data: fields })
    const [, product, first, operator, total] = screen.getAllByRole('columnheader')
    expect(first).toHaveClass('hidden', 'sm:table-cell')
    expect(operator).toHaveClass('hidden', 'sm:table-cell')
    expect(product).not.toHaveClass('hidden')
    expect(total).not.toHaveClass('hidden')
    const cellsOfVolve = within(screen.getAllByRole('row')[1]).getAllByRole('cell')
    expect(cellsOfVolve[2]).toHaveClass('hidden', 'sm:table-cell')
    expect(cellsOfVolve[3]).toHaveClass('hidden', 'sm:table-cell')
  })
})
