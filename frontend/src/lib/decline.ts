import type { DeclineModel, DeclineResult, ProductionMonth, YearMonth } from '@/lib/api/types'
import { formatNumber, monthOf, monthStart } from '@/lib/format'

/** Rate below which a field stops paying, Sm³ per day. An example setting, the same as the API's default. */
export const ECONOMIC_LIMIT = 300
export const FORECAST_MONTHS = 40
/** Below this R², the window does not follow a clear decline, so the forecast is flagged as rough. */
export const WEAK_FIT_R2 = 0.5

/** The three models, with a general note for any field. Design v2 writes notes without a full stop at the end. */
export const DECLINE_MODELS: { value: DeclineModel; label: string; note: string }[] = [
  { value: 'exponential', label: 'Exponential', note: 'Constant decline rate. The most cautious forecast' },
  { value: 'hyperbolic', label: 'Hyperbolic', note: 'Decline slows over time, between the other two models' },
  { value: 'harmonic', label: 'Harmonic', note: 'Decline slows the most, so it forecasts the most oil' },
]

/**
 * Notes that only fit Volve, from design v2. They were checked against the fits the API gives for Volve's
 * default window, Apr 2015 to Aug 2016: exponential R² 0.931, the same as hyperbolic, whose b sits at its lower
 * limit of 0.01, and harmonic R² 0.892.
 */
export const VOLVE_MODEL_NOTES: Record<DeclineModel, string> = {
  exponential: 'Constant decline rate. The most cautious forecast, and the best fit for Volve',
  hyperbolic: 'Decline slows over time. Here the fit pushed b to its floor, so it matches exponential',
  harmonic: 'Decline slows the most, so it forecasts the most oil. It fits Volve less well',
}

export type FitWindow = { start: YearMonth; end: YearMonth }

function addMonths(month: YearMonth, count: number): YearMonth {
  const date = new Date(monthStart(month))
  return monthOf(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1))
}

function monthsBetween(from: YearMonth, to: YearMonth): number {
  const [a, b] = [new Date(monthStart(from)), new Date(monthStart(to))]
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth()
}

/**
 * The months to fit, chosen the same way for every field:
 * it ends at the last month at or above the economic limit (the months after that are the shutdown),
 * and starts at the highest month in the two years before the end, so it covers the latest decline.
 * The window is at least 12 months long. For Volve this gives April 2015 to August 2016.
 */
export function fitWindow(months: ProductionMonth[]): FitWindow | null {
  const above = months.filter((m) => m.oil_rate >= ECONOMIC_LIMIT)
  if (above.length === 0) return null

  const end = above[above.length - 1].month
  const twoYearsBack = addMonths(end, -23)
  const recent = months.filter((m) => m.month >= twoYearsBack && m.month <= end)
  let start = recent.reduce((best, m) => (m.oil_rate > best.oil_rate ? m : best)).month

  if (monthsBetween(start, end) < 11) {
    const yearBack = addMonths(end, -11)
    start = yearBack > months[0].month ? yearBack : months[0].month
  }
  return { start, end }
}

/** b as a number for the fitted values: 0 and 1 for the fixed models, two decimals for hyperbolic. */
export function formatB(result: Pick<DeclineResult, 'model' | 'b'>): string {
  if (result.model === 'exponential') return '0'
  if (result.model === 'harmonic') return '1'
  return formatNumber(result.b, 2)
}

/** When a hyperbolic fit pushed b to the edge of its range, say what that means, so b is not read as precise. */
export function describeBLimit(result: Pick<DeclineResult, 'model' | 'b' | 'b_at_limit'>): string | null {
  if (result.model !== 'hyperbolic' || !result.b_at_limit) return null
  return result.b < 0.5
    ? 'b hit its lower limit, so this decline is really exponential'
    : 'b hit its upper limit, so this decline is really harmonic'
}

/** "Reaches 300 Sm³/day after about 15 more months", or that it does not within the 50 years the API looks ahead. */
export function describeTimeToLimit(months: number | null): string {
  if (months === null) return 'Does not reach the limit within 50 years'
  return `Reaches ${ECONOMIC_LIMIT} Sm³/day after about ${months} more ${months === 1 ? 'month' : 'months'}`
}
