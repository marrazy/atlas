import type { DeclineModel, DeclineResult, ProductionMonth, YearMonth } from '@/lib/api/types'
import { formatNumber, monthOf, monthStart } from '@/lib/format'

/** Rate below which a field stops paying, Sm³ per day. An example setting, the same as the API's default. */
export const ECONOMIC_LIMIT = 300
export const FORECAST_MONTHS = 40
/** Below this R², the window does not follow a clear decline, so the forecast is flagged as rough. */
export const WEAK_FIT_R2 = 0.5

export const DECLINE_MODELS: { value: DeclineModel; label: string; note: string }[] = [
  { value: 'exponential', label: 'Exponential', note: 'Constant decline rate. The most cautious forecast.' },
  { value: 'hyperbolic', label: 'Hyperbolic', note: 'Decline slows over time. Common for fields under water injection.' },
  { value: 'harmonic', label: 'Harmonic', note: 'Decline slows the most. Gives the most hopeful forecast.' },
]

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

/** b in plain words. When the fit pushed b to the edge of its range, the number is not shown as if it were precise. */
export function describeB(result: Pick<DeclineResult, 'model' | 'b' | 'b_at_limit'>): string {
  if (result.model === 'exponential') return 'b = 0 (exponential)'
  if (result.model === 'harmonic') return 'b = 1 (harmonic)'
  if (result.b_at_limit) {
    return result.b < 0.5
      ? 'b hit its lower limit, so this decline is really exponential.'
      : 'b hit its upper limit, so this decline is really harmonic.'
  }
  return `b = ${formatNumber(result.b, 2)} (hyperbolic)`
}

/** "about 15 months" or "about 4.9 years". */
export function describeTimeToLimit(months: number | null): string {
  if (months === null) return 'Does not reach the economic limit within 50 years with this model.'
  const span = months < 24 ? `${months} more months` : `${formatNumber(months / 12, 1)} more years`
  return `Reaches the economic limit after about ${span} with this model.`
}
