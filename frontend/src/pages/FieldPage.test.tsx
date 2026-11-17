import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FieldDetail, ProductionMonth } from '@/lib/api/types'
import { fields, snapshot, volve, volveProduction } from '@/test/fixtures'
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
}

/** The texts in one stat card: label, value and note. */
function card(label: string) {
  const term = screen.getByText(label, { selector: 'dt' })
  return [...term.parentElement!.querySelectorAll('dt, dd')].map((el) => el.textContent)
}

const cardLabels = () => screen.queryAllByRole('term').map((dt) => dt.textContent)

beforeEach(() => {
  setWindowWidth(1280)
  mockApi(API)
})

describe('Volve', () => {
  it('shows the name with status, product and operator badges, and a line built from Sodir data', async () => {
    renderApp('/fields/3420717')
    expect(await screen.findByRole('heading', { level: 1, name: 'Volve' })).toBeInTheDocument()
    const main = within(screen.getByRole('main'))
    expect(main.getByText('Shut down')).toBeInTheDocument()
    expect(main.getByText('Oil')).toBeInTheDocument()
    expect(main.getByText('Equinor')).toBeInTheDocument()
    expect(main.getByText('Oil field in the North Sea, discovered in 1993. Operated by Equinor Energy AS.')).toBeInTheDocument()
    expect(document.title).toBe('Volve · North Sea Field Atlas')
  })

  it('shows the five stat cards with the values from the design', async () => {
    renderApp('/fields/3420717')
    await screen.findByText('Sep 2016')
    expect(card('First production')).toEqual(['First production', 'Feb 2008', 'First month with output'])
    expect(card('Last production')).toEqual(['Last production', 'Sep 2016', 'Field shut down'])
    expect(card('Total oil')).toEqual(['Total oil', '63.3 MMbbl', 'Million barrels, from Sodir'])
    expect(card('Peak rate')).toEqual(['Peak rate', '56,129', 'Barrels a day, Dec 2008'])
    expect(card('Recovery rate')).toEqual(['Recovery rate', '54%', 'Oil in place recovered, per Equinor'])
  })

  it('shows the production charts from the monthly data', async () => {
    renderApp('/fields/3420717')
    expect(await screen.findByRole('img')).toHaveAccessibleName(
      /^Two linked charts for Volve, February 2008 to September 2016\./,
    )
  })
})

describe('other fields', () => {
  it('shows a field that never produced without made-up numbers, and without the Volve recovery rate', async () => {
    renderApp('/fields/42002473')
    expect(await screen.findByRole('heading', { level: 1, name: 'Berling' })).toBeInTheDocument()
    await screen.findAllByText('No production reported')
    expect(card('First production')).toEqual(['First production', 'None', 'No production reported'])
    expect(card('Last production')).toEqual(['Last production', 'None', 'No production reported'])
    expect(card('Total oil')).toEqual(['Total oil', '0.0 MMbbl', 'No oil reported'])
    expect(card('Peak rate')).toEqual(['Peak rate', 'None', 'No oil reported'])
    expect(cardLabels()).not.toContain('Recovery rate')
    expect(within(screen.getByRole('main')).getByText('Gas')).toBeInTheDocument()
    expect(screen.getByText('No production reported for this field.')).toBeInTheDocument()
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
  it('shows placeholders while the field is loading', () => {
    mockApi({ ...API, '/api/fields/3420717': () => new Promise<Response>(() => {}) })
    renderApp('/fields/3420717')
    expect(screen.getByRole('heading', { level: 1, name: 'Loading field' })).toBeInTheDocument()
    expect(cardLabels()).toEqual(['First production', 'Last production', 'Total oil', 'Peak rate'])
    expect(screen.getByText('First production').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true')
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
    await screen.findAllByText('Year only, the monthly data did not load')
    expect(card('First production')).toEqual(['First production', '2008', 'Year only, the monthly data did not load'])
    expect(card('Last production')).toEqual(['Last production', '2016', 'Year only, the monthly data did not load'])
  })
})
