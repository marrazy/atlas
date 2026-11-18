import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { fakeChart } from '@/test/echarts-stub'
import { fields, shelf, snapshot } from '@/test/fixtures'
import { json, mockApi } from '@/test/mock-api'
import { renderApp, setWindowWidth } from '@/test/render-app'

const API = { '/api/snapshot': snapshot, '/api/shelf': shelf, '/api/fields': fields }

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
  it('show the shelf numbers from /api/shelf, and say how far the total goes', async () => {
    renderApp('/')
    await screen.findByText('9.1 bn Sm³')
    expect(card('Producing fields')).toEqual(['Producing fields', '102', 'Current status at Sodir'])
    await waitFor(() =>
      expect(card('Produced since 1971')).toEqual([
        'Produced since 1971',
        '9.1 bn Sm³',
        'Oil equivalent, all fields, up to Aug 2026',
      ]),
    )
    expect(card('Peak year')).toEqual(['Peak year', '2004', '264 million Sm³ o.e.'])
  })

  it('count mapped fields from /api/fields, with the ones that never produced', async () => {
    renderApp('/')
    await screen.findByText('Including 1 with no production yet')
    expect(card('Fields mapped')).toEqual(['Fields mapped', '2', 'Including 1 with no production yet'])
  })

  it('say "Not available" instead of loading forever when the shelf data fails', async () => {
    mockApi({ ...API, '/api/shelf': json({ detail: 'database is down' }, 500) })
    renderApp('/')
    await waitFor(() => expect(card('Peak year')[1]).toBe('Not available'))
    expect(card('Producing fields')[1]).toBe('Not available')
    expect(await screen.findByRole('alert')).toHaveTextContent('Database is down.')
  })
})

describe('Shelf map page', () => {
  it('builds its description from the data: the first field, its year, and the snapshot month', async () => {
    renderApp('/')
    // in this test data Volve (2008) is the earliest field, in the real data it is Ekofisk (1971)
    expect(
      await screen.findByText('Every oil and gas field on the Norwegian Continental Shelf, from Volve in 2008 to August 2026.'),
    ).toBeInTheDocument()
  })

  it('shows the map of the fields', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 2, name: 'Fields on the shelf' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Show the whole shelf' })).toBeInTheDocument()
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
    expect(screen.getByText('1 field had production in 2012.')).toBeInTheDocument()
    await waitFor(() => expect(lineYear()).toBe('2012'))
  })

  it('shows the largest fields table from /api/fields', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 2, name: 'Largest fields' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Volve' })).toHaveAttribute('href', '/fields/3420717')
    expect(await screen.findByText('By total saleable production, up to August 2026.')).toBeInTheDocument()
  })

  it('updates the chart in place, so the year line moves without redrawing the areas', async () => {
    renderApp('/')
    await screen.findByRole('img', { name: /^Stacked area chart/ })
    expect(fakeChart.lastNotMerge).toBe(false)
  })
})
