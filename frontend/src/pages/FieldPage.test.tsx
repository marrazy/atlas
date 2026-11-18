import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { fakeChart } from '@/test/echarts-stub'
import type { FieldDetail, ProductionMonth } from '@/lib/api/types'
import { fields, snapshot, volve, volveDeclineHyperbolic, volveInvestments, volveProduction } from '@/test/fixtures'
import { json, mockApi } from '@/test/mock-api'
import { currentPath, renderApp, setWindowWidth } from '@/test/render-app'

// Volve's real first months, plus its real last month, so first and last production can be checked.
const VOLVE_MONTHS: ProductionMonth[] = [
  ...volveProduction,
  { month: '2016-09', oil_rate: 287.3, gas_rate: 0, gor: null, oe_net_msm3: 0.008 },
]

// Real values for Berling, a field approved for production that has not produced yet.
const BERLING: FieldDetail = {
  ...fields[2],
  hc_type: 'GAS/CONDENSATE',
  main_area: 'Norwegian sea',
  operator_full: 'OMV (Norge) AS',
  discovery_year: 2018,
  cum_liquids_net_msm3: 0,
  cum_gas_net_bsm3: 0,
  total_oil_gross_mmbbl: 0,
  peak_oil_rate: null,
  peak_oil_month: null,
  factpage_url: 'https://factpages.sodir.no/field/pageview/all/42002473',
}

const API = {
  '/api/snapshot': snapshot,
  '/api/fields': fields,
  '/api/fields/3420717': volve,
  '/api/fields/3420717/production': VOLVE_MONTHS,
  '/api/fields/42002473': BERLING,
  '/api/fields/42002473/production': [],
  '/api/fields/3420717/investments': volveInvestments,
  '/api/fields/42002473/investments': [],
  '/api/decline-fit': volveDeclineHyperbolic,
}

/** The texts in one stat card: label, value and note. */
function card(label: string) {
  const term = screen.getByText(label, { selector: 'dt' })
  return [...term.parentElement!.querySelectorAll('dt, dd')].map((el) => el.textContent)
}

// the stat cards are the first list of terms on the page; the decline panel's fitted values are another
const cardLabels = () => {
  const grid = screen.queryAllByRole('term')[0]?.closest('dl')
  return grid ? [...grid.querySelectorAll(':scope > div > dt')].map((dt) => dt.textContent) : []
}

// the page loads lazily, so load its code once here and the first test does not spend its wait time on that
beforeAll(() => import('@/pages/FieldPage'))

beforeEach(() => {
  setWindowWidth(1280)
  mockApi(API)
})

describe('Volve', () => {
  it('shows the name and one meta row: status, main product, operator and coordinates, as dots and plain text', async () => {
    renderApp('/fields/3420717')
    const title = await screen.findByRole('heading', { level: 1, name: 'Volve' })
    const meta = within(title.nextElementSibling as HTMLElement)
    expect(title.nextElementSibling).toHaveTextContent('Shut downOilEquinor58°26′N 001°53′E')
    // shut down is a ring in the muted colour, oil a filled oil dot
    expect(meta.getByText('Shut down').querySelector('.border-muted-foreground')).not.toBeNull()
    expect(meta.getByText('Oil').querySelector('.bg-oil')).not.toBeNull()
    expect(meta.getByText('58°26′N 001°53′E')).toHaveClass('font-mono')
    expect(document.title).toBe('Volve · North Sea Field Atlas')
  })

  it('shows the four stat cards of design v2, with the values from the API and Equinor', async () => {
    renderApp('/fields/3420717')
    await screen.findByText('8.6 years')
    expect(card('Producing life')).toEqual(['Producing life', '8.6 years', 'Feb 2008 to Sep 2016'])
    expect(card('Total oil')).toEqual(['Total oil', '63.3 MMbbl', 'Million barrels, gross'])
    expect(card('Peak rate')).toEqual(['Peak rate', '56,129', 'Barrels a day, Dec 2008'])
    expect(card('Recovery rate')).toEqual(['Recovery rate', '54%', 'Of oil in place, as reported by Equinor'])
    expect(cardLabels()).toEqual(['Producing life', 'Total oil', 'Peak rate', 'Recovery rate'])
    expect(screen.getByText('Total oil', { selector: 'dt' }).parentElement).toHaveClass('bg-tint-oil')
  })

  it('shows the decline panel under the production charts', async () => {
    renderApp('/fields/3420717')
    expect(await screen.findByText('b hit its lower limit, so this decline is really exponential')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Decline curve' })).toBeInTheDocument()
  })

  it('shows the investment chart and the sources, with no Equinor dataset card', async () => {
    renderApp('/fields/3420717')
    expect(await screen.findByText('Million NOK, not adjusted for inflation')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volve on Sodir FactPages (opens in a new tab)' })).toBeInTheDocument()
    expect(screen.queryByText(/Equinor (Volve )?dataset/)).not.toBeInTheDocument()
  })

  it('marks the stretch where Volve output rises again on the production chart', async () => {
    renderApp('/fields/3420717')
    await screen.findByRole('img', { name: /^Two linked charts for Volve/ })
    await waitFor(() => expect(JSON.stringify(fakeChart.options)).toContain('Output rises again'))
  })

  it('shows the production charts from the monthly data', async () => {
    renderApp('/fields/3420717')
    expect(
      await screen.findByRole('img', { name: /^Two linked charts for Volve, February 2008 to September 2016\./ }),
    ).toBeInTheDocument()
  })
})

describe('other fields', () => {
  it('shows a field that never produced without made-up numbers, and without the Volve recovery rate', async () => {
    renderApp('/fields/42002473')
    expect(await screen.findByRole('heading', { level: 1, name: 'Berling' })).toBeInTheDocument()
    await screen.findAllByText('No production reported')
    expect(card('Producing life')).toEqual(['Producing life', 'None', 'No production reported'])
    expect(card('Total oil')).toEqual(['Total oil', '0.0 MMbbl', 'No oil reported'])
    expect(card('Peak rate')).toEqual(['Peak rate', 'None', 'No oil reported'])
    // the recovery rate is from Equinor and only for Volve, so other fields show the discovery year from the API
    expect(cardLabels()).not.toContain('Recovery rate')
    expect(card('Discovered')).toEqual(['Discovered', '2018', 'Discovery year, from Sodir'])
    expect(within(screen.getByRole('main')).getByText('Gas')).toBeInTheDocument()
    expect(screen.getByText('No production reported for this field')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Decline curve' })).not.toBeInTheDocument()
    expect(await screen.findByText('No investment reported for this field')).toBeInTheDocument()
  })

  it('opens another field from the picker', async () => {
    renderApp('/fields/3420717')
    await screen.findByRole('heading', { level: 1, name: 'Volve' })
    fireEvent.click(screen.getByRole('button', { name: 'Field Volve' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('option', { name: 'Berling' }))
    expect(currentPath()).toBe('/fields/42002473')
    expect(await screen.findByRole('heading', { level: 1, name: 'Berling' })).toBeInTheDocument()
  })
})

describe('loading and errors', () => {
  it('shows placeholders while the field is loading', async () => {
    mockApi({ ...API, '/api/fields/3420717': () => new Promise<Response>(() => {}) })
    renderApp('/fields/3420717')
    expect(await screen.findByRole('heading', { level: 1, name: 'Loading field' })).toBeInTheDocument()
    expect(cardLabels()).toEqual(['Producing life', 'Total oil', 'Peak rate', 'Discovered'])
    expect(screen.getByText('Producing life').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true')
  })

  it('says the field was not found when the API answers 404', async () => {
    renderApp('/fields/1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Field not found' })).toBeInTheDocument()
  })

  it('shows the error and keeps the picker when the field fails to load', async () => {
    mockApi({ ...API, '/api/fields/3420717': json({ detail: 'database is down' }, 500) })
    renderApp('/fields/3420717')
    expect(await screen.findByRole('alert')).toHaveTextContent('Database is down.')
    expect(screen.getByRole('heading', { level: 1, name: 'Field deep dive' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Field/ })).toBeInTheDocument()
  })

  it('falls back to the years from the field record when the monthly data fails', async () => {
    mockApi({ ...API, '/api/fields/3420717/production': json({ detail: 'oops' }, 500) })
    renderApp('/fields/3420717')
    await screen.findByText('2008 to 2016, the monthly data did not load')
    expect(card('Producing life')).toEqual(['Producing life', '9 years', '2008 to 2016, the monthly data did not load'])
  })
})
