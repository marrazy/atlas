import { screen, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { snapshot } from '@/test/fixtures'
import { json, mockApi } from '@/test/mock-api'
import { renderApp, setWindowWidth } from '@/test/render-app'

// the page loads lazily, so load its code once here and the first test does not spend its wait time on that
beforeAll(() => import('@/pages/MethodsPage'))

beforeEach(() => {
  setWindowWidth(1280)
  mockApi({ '/api/snapshot': snapshot })
})

const section = (title: string) => within(screen.getByRole('heading', { level: 2, name: title }).closest('section')!)

describe('Methods page', () => {
  it('has a section for the data, the units, decline curves, lifecycles and the map', async () => {
    renderApp('/methods')
    expect(await screen.findByRole('heading', { level: 1, name: 'Methods' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'The data',
      'Units',
      'Decline curves',
      'Field lifecycles',
      'Shelf map',
    ])
  })

  it('describes the download with the numbers from /api/snapshot', async () => {
    renderApp('/methods')
    const data = section('The data')
    expect(
      await data.findByText(
        "All numbers come from one download of Sodir's open data, made on 15 November 2026. It holds 28,442 rows of monthly production for 142 fields, up to August 2026, shared under the NLOD 2.0 licence.",
      ),
    ).toBeInTheDocument()
    expect(data.getByText(/Charts by year stop at 2025, the last full year\./)).toBeInTheDocument()
    expect(data.getByText(/^189 monthly rows have negative values\./)).toBeInTheDocument()
    expect(data.getByText('Sindre has no outline in the data, so it is not on the map.')).toBeInTheDocument()
  })

  it('names the one value that is not from Sodir, and where it comes from', async () => {
    renderApp('/methods')
    expect(await screen.findByText(/Volve's recovery rate of 54%, published by Equinor\./)).toBeInTheDocument()
  })

  it('still explains the methods when the snapshot cannot be loaded', async () => {
    mockApi({ '/api/snapshot': json({ detail: 'database is down' }, 500) })
    renderApp('/methods')
    expect(await screen.findByText(/The details of the download could not be loaded\./)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Decline curves' })).toBeInTheDocument()
  })

  it('lists the units in a table, with the barrels factor and the gas oil ratio rule from the code', async () => {
    renderApp('/methods')
    const table = await screen.findByRole('table', { name: 'Units used in the atlas' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual([
      'Sm³',
      'Million Sm³',
      'Billion Sm³',
      'Sm³/day',
      'Sm³ o.e.',
      'bbl, MMbbl',
      'Sm³/Sm³',
      'Million NOK',
    ])
    expect(within(table).getByText(/1 Sm³ of oil = 6\.2898 barrels/)).toBeInTheDocument()
    expect(within(table).getByText(/left empty when oil is 50 Sm³\/day or less/)).toBeInTheDocument()
  })

  it('gives the three Arps formulas and the settings the decline panel uses', async () => {
    renderApp('/methods')
    const decline = section('Decline curves')
    expect(await decline.findByText('q(t) = qi × e^(−Di × t)')).toBeInTheDocument()
    expect(decline.getByText('q(t) = qi ÷ (1 + b × Di × t)^(1 ÷ b)')).toBeInTheDocument()
    expect(decline.getByText('q(t) = qi ÷ (1 + Di × t)')).toBeInTheDocument()
    expect(decline.getByText(/may choose b from 0\.01 to 1\./)).toBeInTheDocument()
    expect(decline.getByText(/at least 6 months are needed/)).toBeInTheDocument()
    expect(decline.getByText(/The economic limit is 300 Sm³\/day\. It is an example setting/)).toBeInTheDocument()
    expect(decline.getByText(/The forecast runs 40 months past the window\./)).toBeInTheDocument()
    expect(decline.getByText(/looking up to 50 years ahead/)).toBeInTheDocument()
  })

  it('gives the lifecycle rules from the settings and the backend', async () => {
    renderApp('/methods')
    const lifecycles = section('Field lifecycles')
    expect(
      await lifecycles.findByText(/at least 8 million Sm³ o\.e\. in total and have at least 4 years with production/),
    ).toBeInTheDocument()
    expect(lifecycles.getByText(/within 10% of the best year/)).toBeInTheDocument()
    expect(lifecycles.getByText(/at least 8 fields reached that age/)).toBeInTheDocument()
  })

  it('is in the sidebar', async () => {
    renderApp('/methods')
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    const link = within(nav).getByRole('link', { name: 'Methods' })
    expect(link).toHaveAttribute('href', '/methods')
    expect(link).toHaveAttribute('aria-current', 'page')
  })
})
