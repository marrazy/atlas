import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeclineResult, FieldDetail } from '@/lib/api/types'
import { volve, volveDeclineHyperbolic, volveLateProduction } from '@/test/fixtures'
import { json } from '@/test/mock-api'
import { DeclineCard } from './DeclineCard'

const WINDOW = { start: '2015-04', end: '2016-08' }

// The real Volve exponential fit, shortened like the hyperbolic one in the fixtures.
const EXPONENTIAL: DeclineResult = {
  ...volveDeclineHyperbolic,
  model: 'exponential',
  qi: 3040.4,
  di_annual_pct: 87.9,
  b: 0,
  b_at_limit: false,
}

let fitFetch: ReturnType<typeof vi.fn>

function mockFit(answer: (body: { model: string }) => Response) {
  fitFetch = vi.fn((_url: string, init?: RequestInit) => Promise.resolve(answer(JSON.parse(String(init?.body)))))
  vi.stubGlobal('fetch', fitFetch)
}

const sentBodies = () => fitFetch.mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)))

const renderCard = (field: FieldDetail = volve, window: typeof WINDOW | null = WINDOW) =>
  render(<DeclineCard field={field} months={volveLateProduction} window={window} />)

beforeEach(() => {
  mockFit((body) => json(body.model === 'exponential' ? EXPONENTIAL : volveDeclineHyperbolic))
})

/** The fitted values grid as name and value pairs, the way it reads. */
const fittedValues = () => {
  const grid = screen.getByRole('heading', { level: 3, name: 'Fitted values' }).nextElementSibling!
  const items = [...grid.querySelectorAll('dt, dd')].map((el) => el.textContent)
  return Object.fromEntries(items.flatMap((text, i) => (i % 2 === 0 ? [[text, items[i + 1]]] : [])))
}

describe('DeclineCard', () => {
  it('starts on the exponential model, the best fit for Volve, and asks the API for the chosen window', async () => {
    renderCard()
    expect(screen.getByRole('tab', { name: 'Exponential' })).toHaveAttribute('aria-selected', 'true')
    await screen.findByRole('heading', { level: 3, name: 'Fitted values' })
    expect(sentBodies()[0]).toEqual({
      field_id: 3420717,
      start: '2015-04',
      end: '2016-08',
      model: 'exponential',
      forecast_months: 40,
      economic_limit: 300,
    })
  })

  it('has the title "Decline curve" only, the tabs at its right, and the unit at the right of the legend', () => {
    renderCard()
    const heading = screen.getByRole('heading', { level: 2, name: 'Decline curve' })
    expect(heading.parentElement!.querySelectorAll('p')).toHaveLength(0)
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Exponential', 'Hyperbolic', 'Harmonic'])
    expect(screen.getAllByText('Oil rate, Sm³/day, log scale').length).toBeGreaterThan(0)
    for (const item of ['Monthly oil rate', 'Fitted curve', 'Forecast', 'Forecast range']) {
      expect(screen.getAllByText(item).length).toBeGreaterThan(0)
    }
  })

  it('shows the fitted values as a two column grid, and the Volve note for the model', async () => {
    renderCard()
    await screen.findByRole('heading', { level: 3, name: 'Fitted values' })
    expect(fittedValues()).toEqual({ qi: '3,040 Sm³/day', Di: '87.9% a year', b: '0', 'R²': '0.93' })
    expect(screen.getByText('Constant decline rate. The most cautious forecast, and the best fit for Volve')).toBeInTheDocument()
  })

  it('says what was left for a field that shut down, at 24px', async () => {
    renderCard()
    expect(await screen.findByRole('heading', { level: 3, name: 'If Volve had kept running' })).toBeInTheDocument()
    expect(screen.getByText('1.6 MMbbl')).toHaveClass('text-2xl', 'font-medium')
    expect(screen.getByText('Reaches 300 Sm³/day after about 15 more months')).toBeInTheDocument()
  })

  it('switches model with the tabs, fits again, and says b hit its limit instead of showing a precise b', async () => {
    renderCard()
    await screen.findByRole('heading', { level: 3, name: 'Fitted values' })
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Hyperbolic' }), { button: 0 })
    expect(await screen.findByText('b hit its lower limit, so this decline is really exponential')).toBeInTheDocument()
    expect(fittedValues()).toMatchObject({ qi: '3,043 Sm³/day', Di: '88.4% a year', b: '0.01' })
    expect(screen.getByText('Decline slows over time. Here the fit pushed b to its floor, so it matches exponential')).toBeInTheDocument()
    expect(sentBodies().map((b) => b.model)).toEqual(['exponential', 'hyperbolic'])
  })

  it('uses the general note, not the Volve one, for other fields', async () => {
    renderCard({ ...volve, field_id: 43506, name: 'Ekofisk', status: 'Producing' })
    await screen.findByRole('heading', { level: 3, name: 'Fitted values' })
    expect(screen.getByText('Constant decline rate. The most cautious forecast')).toBeInTheDocument()
    expect(screen.queryByText(/Volve/)).not.toBeInTheDocument()
  })

  it('warns that the forecast is rough when the window has no clear decline', async () => {
    mockFit(() => json({ ...EXPONENTIAL, r2: 0.015 }))
    renderCard({ ...volve, field_id: 43506, name: 'Ekofisk', status: 'Producing' })
    expect(await screen.findByRole('note')).toHaveTextContent('This window does not follow a clear decline, so treat this forecast as very rough')
    expect(screen.getByRole('heading', { level: 3, name: 'If Ekofisk keeps declining like this' })).toBeInTheDocument()
  })

  it('has no warning for a clear decline like Volve', async () => {
    renderCard()
    await screen.findByRole('heading', { level: 3, name: 'Fitted values' })
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('shows the API message when the curve cannot be fitted', async () => {
    mockFit(() => json({ detail: 'the curve could not be fitted to this window, try another one' }, 422))
    renderCard()
    expect(await screen.findByRole('alert')).toHaveTextContent('The curve could not be fitted to this window, try another one.')
  })

  it('explains why there is no curve when the field never had enough oil', () => {
    renderCard({ ...volve, name: 'Ormen Lange' }, null)
    expect(screen.getByText(/Too little oil to fit a decline curve\. No month reached the 300 Sm³\/day example limit/)).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(fitFetch).not.toHaveBeenCalled()
  })

  it('gives the chart a spoken description', async () => {
    renderCard()
    const panel = screen.getByRole('tabpanel')
    await waitFor(() => expect(within(panel).getByRole('img')).toHaveAccessibleName(/^Exponential Arps decline curve fitted to Volve/))
  })
})
