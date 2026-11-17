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

describe('DeclineCard', () => {
  it('starts on the hyperbolic model, like the design, and asks the API for the chosen window', async () => {
    renderCard()
    expect(screen.getByRole('tab', { name: 'Hyperbolic' })).toHaveAttribute('aria-selected', 'true')
    await screen.findByText(/qi = /)
    expect(sentBodies()[0]).toEqual({
      field_id: 3420717,
      start: '2015-04',
      end: '2016-08',
      model: 'hyperbolic',
      forecast_months: 40,
      economic_limit: 300,
    })
  })

  it('describes the window in its own words', () => {
    renderCard()
    expect(screen.getByText(/^Arps model fitted to the real oil rate from April 2015 to August 2016\./)).toBeInTheDocument()
  })

  it('says b hit its limit, instead of showing a precise b, and shows the fitted numbers with units', async () => {
    renderCard()
    expect(await screen.findByText('b hit its lower limit, so this decline is really exponential.')).toBeInTheDocument()
    expect(screen.getByText('qi = 3,043 Sm³/day')).toBeInTheDocument()
    expect(screen.getByText('Di = 88.4% a year')).toBeInTheDocument()
    expect(screen.getByText('R² = 0.93, 17 months')).toBeInTheDocument()
  })

  it('says what was left for a field that shut down', async () => {
    renderCard()
    expect(await screen.findByRole('heading', { level: 3, name: 'If Volve had kept running' })).toBeInTheDocument()
    expect(screen.getByText('About 1.6 MMbbl more')).toBeInTheDocument()
    expect(screen.getByText('Reaches the economic limit after about 15 more months with this model.')).toBeInTheDocument()
  })

  it('switches model with the tabs and fits again', async () => {
    renderCard()
    await screen.findByText(/qi = 3,043/)
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Exponential' }), { button: 0 })
    expect(await screen.findByText('b = 0 (exponential)')).toBeInTheDocument()
    expect(screen.getByText('qi = 3,040 Sm³/day')).toBeInTheDocument()
    expect(sentBodies().at(-1)).toMatchObject({ model: 'exponential' })
    expect(screen.getByText('Constant decline rate. The most cautious forecast.')).toBeInTheDocument()
  })

  it('warns that the forecast is rough when the window has no clear decline', async () => {
    mockFit(() => json({ ...volveDeclineHyperbolic, r2: 0.015 }))
    renderCard({ ...volve, name: 'Ekofisk', status: 'Producing' })
    expect(await screen.findByRole('note')).toHaveTextContent(
      'This window does not follow a clear decline (R² 0.02), so treat this forecast as very rough.',
    )
    expect(screen.getByRole('heading', { level: 3, name: 'If Ekofisk keeps declining like this' })).toBeInTheDocument()
  })

  it('has no warning for a clear decline like Volve', async () => {
    renderCard()
    await screen.findByText(/qi = /)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('shows the API message when the curve cannot be fitted', async () => {
    mockFit(() => json({ detail: 'the curve could not be fitted to this window, try another one' }, 422))
    renderCard()
    expect(await screen.findByRole('alert')).toHaveTextContent('The curve could not be fitted to this window, try another one.')
  })

  it('explains why there is no curve when the field never had enough oil', () => {
    renderCard({ ...volve, name: 'Ormen Lange' }, null)
    expect(screen.getByText(/Too little oil to fit a decline curve\. No month reached the 300 Sm³\/day example limit\./)).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(fitFetch).not.toHaveBeenCalled()
  })

  it('gives the chart a spoken description', async () => {
    renderCard()
    const panel = screen.getByRole('tabpanel')
    await waitFor(() => expect(within(panel).getByRole('img')).toHaveAccessibleName(/^Hyperbolic Arps decline curve fitted to Volve/))
  })
})
