import type { FieldSummary, ShelfSummary } from '@/lib/api/types'

/**
 * The years the slider covers: from the first year any field produced to the last full year in the
 * snapshot, so the unfinished current year is left out, as in the shelf chart. 1971 to 2025.
 */
export function yearRange(fields: FieldSummary[], lastFullYear: number): [number, number] | null {
  const years = fields.flatMap((f) => f.producing_years).filter((y) => y <= lastFullYear)
  if (years.length === 0) return null
  return [Math.min(...years), Math.max(...years)]
}


/** How many rows the largest fields table shows, like the design. */
export const LARGEST_FIELDS_COUNT = 8

/** The fields with the most total saleable production, largest first. Fields that never produced are left out. */
export function largestFields(fields: FieldSummary[], count = LARGEST_FIELDS_COUNT): FieldSummary[] {
  return fields
    .filter((f) => f.cum_oe_net_msm3 > 0)
    .sort((a, b) => b.cum_oe_net_msm3 - a.cum_oe_net_msm3)
    .slice(0, count)
}

/**
 * Gas as a share of all output in oil equivalent, in the last full year and in the peak year.
 * In /api/shelf, liquids and gas add up to the yearly oil equivalent total (2004: 185.1 + 79.3 = 264.4), so gas ÷ total is its share.
 */
export function gasShare(shelf: ShelfSummary): { last: { year: number; percent: number }; peak: { year: number; percent: number } } | null {
  const last = shelf.years.at(-1)
  const peak = shelf.years.find((y) => y.year === shelf.peak_year)
  if (!last || !peak || last.oe_net_msm3 <= 0 || peak.oe_net_msm3 <= 0) return null
  const percent = (y: typeof last) => (y.gas_net_bsm3 / y.oe_net_msm3) * 100
  return { last: { year: last.year, percent: percent(last) }, peak: { year: peak.year, percent: percent(peak) } }
}
