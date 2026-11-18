import { screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { lifecycles, snapshot } from '@/test/fixtures'
import { json, mockApi } from '@/test/mock-api'
import { renderApp, setWindowWidth } from '@/test/render-app'

const LIFECYCLES_URL = '/api/lifecycles?min_cum=8&include=3420717'
const API = { '/api/snapshot': snapshot, [LIFECYCLES_URL]: lifecycles }

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
    expect(card('Fields compared')).toEqual(['Fields compared', '1', 'At least 8 million Sm³ o.e. and 4 years of production'])
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
    expect(await screen.findByRole('alert')).toHaveTextContent('Database is down.')
  })
})

describe('Field lifecycles chart', () => {
  it('asks for the fields over the size limit, with Volve by id, and highlights Volve', async () => {
    const fetchMock = mockApi(API)
    renderApp('/lifecycles')
    expect(await screen.findByRole('img', { name: /^Line chart of 1 fields.*Volve is highlighted/ })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(LIFECYCLES_URL, expect.anything())
  })

  it('names each kind of line in the legend, and says how far the data goes from /api/snapshot', async () => {
    renderApp('/lifecycles')
    expect(await screen.findByRole('heading', { level: 2, name: 'Production as a share of best year' })).toBeInTheDocument()
    expect(
      await screen.findByText(
        'Yearly saleable production in oil equivalent, full years up to 2025. Each line is one field, lined up at its first year of production.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Median of all fields')).toBeInTheDocument()
    expect(screen.getByText('Other fields')).toBeInTheDocument()
  })

  it('has zoom, reset and save buttons', async () => {
    renderApp('/lifecycles')
    expect(await screen.findByRole('button', { name: 'Zoom into an area' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save as image' })).toBeInTheDocument()
  })
})
