import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { fields, lifecycles, snapshot } from '@/test/fixtures'
import { json, mockApi } from '@/test/mock-api'
import { renderApp, setWindowWidth } from '@/test/render-app'

// the six fields that can be highlighted are asked for by id
const LIFECYCLES_URL =
  '/api/lifecycles?min_cum=8&include=3420717&include=43658&include=46437&include=43506&include=43686&include=26376286'
const API = { '/api/snapshot': snapshot, '/api/fields': fields, [LIFECYCLES_URL]: lifecycles }

/** The texts in one stat card: label, value and note. */
function card(label: string) {
  const term = screen.getByText(label, { selector: 'dt' })
  return [...term.parentElement!.querySelectorAll('dt, dd')].map((el) => el.textContent)
}

// the page loads lazily, so load its code once here and the first test does not spend its wait time on that
beforeAll(() => import('@/pages/LifecyclesPage'))

beforeEach(() => {
  setWindowWidth(1280)
  mockApi(API)
})

describe('Field lifecycles stat cards', () => {
  it('show the count and medians worked out from /api/lifecycles, with the rules for which fields are in', async () => {
    renderApp('/lifecycles')
    await waitFor(() => expect(card('Fields compared')[1]).toBe('1'))
    expect(card('Fields compared')).toEqual(['Fields compared', '1', 'At least 8 million Sm³ o.e. and 4 full years'])
    // the test data has only Volve: best year 2009, one year after 2008, and one year near it
    expect(card('Typical best year')).toEqual([
      'Typical best year',
      'Year 1',
      'Median years from first production to the best year',
    ])
    expect(card('Typical time near peak')).toEqual([
      'Typical time near peak',
      '1 year',
      'Median years within 10% of the best year',
    ])
  })

  it('say "Not available" and show the error when /api/lifecycles fails', async () => {
    mockApi({ ...API, [LIFECYCLES_URL]: json({ detail: 'database is down' }, 500) })
    renderApp('/lifecycles')
    await waitFor(() => expect(card('Fields compared')[1]).toBe('Not available'))
    expect(card('Typical best year')[1]).toBe('Not available')
    // both chart cards need this data, so both say what went wrong
    const alerts = await screen.findAllByRole('alert')
    expect(alerts).toHaveLength(2)
    for (const alert of alerts) expect(alert).toHaveTextContent('Database is down.')
  })
})

describe('Field lifecycles chart', () => {
  it('asks for the fields over the size limit, with the fields to highlight by id, and highlights Volve first', async () => {
    const fetchMock = mockApi(API)
    renderApp('/lifecycles')
    expect(await screen.findByRole('img', { name: /^Line chart of 1 fields.*Volve is highlighted/ })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(LIFECYCLES_URL, expect.anything())
  })

  it('names each kind of line in the legend, with the unit at the right, and no description line', async () => {
    renderApp('/lifecycles')
    const heading = await screen.findByRole('heading', { level: 2, name: 'Production as a share of the best year' })
    expect(heading.parentElement!.querySelectorAll('p')).toHaveLength(0)
    const card = within(heading.closest('section')!)
    for (const item of ['Selected field', 'Median of all fields', 'Other fields', "Share of each field's best year"]) {
      expect(await card.findByText(item)).toBeInTheDocument()
    }
  })

  it('has no toolbox buttons, as design v2 asks', async () => {
    renderApp('/lifecycles')
    const heading = await screen.findByRole('heading', { level: 2, name: 'Production as a share of the best year' })
    await screen.findByRole('img', { name: /^Line chart/ })
    expect(within(heading.closest('section')!).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('Field lifecycles highlight', () => {
  const troll = { ...lifecycles.fields[0], field_id: 46437, name: 'Troll', main_product: 'gas', first_year: 1990, peak_year: 2003, plateau_years: 10 }
  const withTroll = { ...lifecycles, fields: [...lifecycles.fields, troll] }

  it('offers a button for each field to highlight that is in the data, named from the data', async () => {
    mockApi({ ...API, [LIFECYCLES_URL]: withTroll })
    renderApp('/lifecycles')
    const group = await screen.findByRole('group', { name: 'Highlight' })
    expect([...group.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Volve', 'Troll'])
    expect(screen.getByRole('button', { name: 'Volve' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('highlights the picked field on both charts and tells its story under the bars', async () => {
    mockApi({ ...API, [LIFECYCLES_URL]: withTroll })
    renderApp('/lifecycles')
    expect(
      await screen.findByText('Volve started in 2008, had its best year in 2009, and spent 1 year within 10% of it'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Troll' }))
    expect(screen.getByRole('button', { name: 'Troll' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('img', { name: /^Line chart.*Troll is highlighted/ })).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Years within 10% of the best year, by field' })
    expect(within(list).getByText('Troll')).toHaveClass('font-medium')
    expect(within(list).getByText('Volve')).not.toHaveClass('font-medium')
    expect(
      screen.getByText('Troll started in 1990, had its best year in 2003, and spent 10 years within 10% of it'),
    ).toBeInTheDocument()
  })

  it('lists the years within 10% of the best year as rows with a bar and a number, most years first', async () => {
    mockApi({ ...API, [LIFECYCLES_URL]: withTroll })
    renderApp('/lifecycles')
    const list = await screen.findByRole('list', { name: 'Years within 10% of the best year, by field' })
    expect(within(list).getAllByRole('listitem').map((row) => row.textContent)).toEqual(['Troll10 years', 'Volve1 year'])
  })

  it('shows the error in the list card if /api/fields fails', async () => {
    mockApi({ ...API, '/api/fields': json({ detail: 'database is down' }, 500) })
    renderApp('/lifecycles')
    expect(await screen.findByRole('heading', { level: 2, name: 'Years within 10% of the best year' })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Database is down.')
  })
})
