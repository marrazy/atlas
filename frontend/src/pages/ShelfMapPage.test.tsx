import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { fakeChart } from '@/test/echarts-stub'
import { fields, shelf, snapshot } from '@/test/fixtures'
import { json, mockApi } from '@/test/mock-api'
import { renderApp, setWindowWidth } from '@/test/render-app'

// the shelf fixture with 2025 added, the last full year in the real data
const SHELF = { ...shelf, years: [...shelf.years, { year: 2025, liquids_net_msm3: 118.649, gas_net_bsm3: 121.831, oe_net_msm3: 240.48 }] }
const API = { '/api/snapshot': snapshot, '/api/shelf': SHELF, '/api/fields': fields }

/** The texts in one stat card: label, value and note. */
function card(label: string) {
  const term = screen.getByText(label, { selector: 'dt' })
  return [...term.parentElement!.querySelectorAll('dt, dd')].map((el) => el.textContent)
}

// the page loads lazily, so load its code once here and the first test does not spend its wait time on that
beforeAll(() => import('@/pages/ShelfMapPage'))

beforeEach(() => {
  setWindowWidth(1280)
  mockApi(API)
})

describe('Shelf map stat cards', () => {
  it('show the four numbers of design v2, from /api/shelf and /api/fields', async () => {
    renderApp('/')
    await screen.findByText('9.1 bn Sm³')
    await waitFor(() => expect(card('Producing fields')).toEqual(['Producing fields', '102', 'Of 3 fields on the shelf']))
    expect(card('Produced since 1971')).toEqual(['Produced since 1971', '9.1 bn Sm³', 'Oil equivalent, all fields'])
    expect(card('Peak year')).toEqual(['Peak year', '2004', '264 million Sm³ o.e.'])
    expect(card('Gas share of output')).toEqual(['Gas share of output', '51%', 'In 2025, vs 30% in 2004'])
  })

  it('tint the peak year card for oil and the gas share card for gas, with a gas dot, and leave the rest white', async () => {
    renderApp('/')
    await screen.findByText('51%')
    const box = (label: string) => screen.getByText(label, { selector: 'dt' }).parentElement!
    expect(box('Peak year')).toHaveClass('bg-tint-oil')
    expect(box('Gas share of output')).toHaveClass('bg-tint-gas')
    expect(box('Gas share of output').querySelector('.bg-gas')).not.toBeNull()
    expect(box('Producing fields')).toHaveClass('bg-card')
    expect(box('Producing fields').querySelector('svg')).toBeNull()
  })

  it('say "Not available" instead of loading forever when the shelf data fails', async () => {
    mockApi({ ...API, '/api/shelf': json({ detail: 'database is down' }, 500) })
    renderApp('/')
    await waitFor(() => expect(card('Peak year')[1]).toBe('Not available'))
    expect(card('Producing fields')[1]).toBe('Not available')
    expect(await screen.findByRole('alert')).toHaveTextContent('Database is down.')
  })
})

describe('Shelf map errors', () => {
  it('loads the data again with "Try again" after a server fault, and then shows it', async () => {
    let calls = 0
    mockApi({
      ...API,
      '/api/shelf': () => Promise.resolve(++calls === 1 ? json({ detail: 'database is down' }, 500) : json(SHELF)),
    })
    renderApp('/')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Database is down.')

    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('img', { name: /^Stacked area chart/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(card('Peak year')[1]).toBe('2004')
    expect(calls).toBe(2)
  })
})

describe('Shelf map page', () => {
  it('has the page title only, with no subtitle', async () => {
    renderApp('/')
    const title = await screen.findByRole('heading', { level: 1, name: 'Shelf map' })
    expect(title.nextElementSibling?.tagName).not.toBe('P')
  })

  it('shows the map of the fields', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 2, name: 'Fields on the shelf' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Zoom out to the whole shelf' })).toBeInTheDocument()
  })

  it('shows the shelf production chart with its spoken description', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 2, name: 'Shelf production by year' })).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: /^Stacked area chart of yearly saleable production/ })).toBeInTheDocument()
    expect(screen.getByText('Oil, NGL and condensate')).toBeInTheDocument()
  })

  it('starts the year slider on the last full year from /api/snapshot, and the chart line follows it', async () => {
    renderApp('/')
    const slider = await screen.findByRole('slider', { name: 'Year' })
    expect(slider).toHaveValue('2025')
    const lineYear = () =>
      (fakeChart.lastOption as { series: { markLine?: { data: { xAxis: string }[] } }[] }).series[0].markLine?.data[0]?.xAxis
    await waitFor(() => expect(lineYear()).toBe('2025'))

    fireEvent.change(slider, { target: { value: '2012' } })
    expect(screen.getByText(/1 field producing$/)).toHaveTextContent('In 2012, 1 field producing')
    await waitFor(() => expect(lineYear()).toBe('2012'))
  })

  it('shows the largest fields table from /api/fields', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 2, name: 'Largest fields' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Volve' })).toHaveAttribute('href', '/fields/3420717')
  })

  it('updates the chart in place, so the year line moves without redrawing the areas', async () => {
    renderApp('/')
    await screen.findByRole('img', { name: /^Stacked area chart/ })
    expect(fakeChart.lastNotMerge).toBe(false)
  })
})
