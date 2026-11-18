import type { FieldSummary, Lifecycle, LifecyclePoint, LifecycleSet } from '@/lib/api/types'

/** The middle value, or the mean of the two middle values. Null for an empty list. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export type LifecycleStats = {
  compared: number
  /** Median years from first production to the best year. */
  bestAge: number | null
  /** Median number of years within 10% of the best year. */
  nearPeakYears: number | null
}

export function lifecycleStats(set: LifecycleSet): LifecycleStats {
  return {
    compared: set.fields.length,
    bestAge: median(set.fields.map((f) => f.peak_year - f.first_year)),
    nearPeakYears: median(set.fields.map((f) => f.plateau_years)),
  }
}

export type LinePoint = [age: number, share: number | null]

/** The points for one line, with an empty point wherever ages are skipped, so the line breaks there (Heimdal). */
export function lifecycleLine(series: LifecyclePoint[]): LinePoint[] {
  const line: LinePoint[] = []
  series.forEach(([age, share], i) => {
    const previous = series[i - 1]
    if (previous && age - previous[0] > 1) line.push([previous[0] + 1, null])
    line.push([age, share])
  })
  return line
}

export function findLifecycle(set: LifecycleSet, fieldId: number | null): Lifecycle | null {
  return set.fields.find((f) => f.field_id === fieldId) ?? null
}

/**
 * The fields for the years near peak bars: the largest fields by total production, plus the fields that can be
 * highlighted, most years near peak first. Fields with the same number of years keep the larger one first.
 */
export function nearPeakFields(set: LifecycleSet, fields: FieldSummary[], picks: number[], largest: number): Lifecycle[] {
  const size = new Map(fields.map((f) => [f.field_id, f.cum_oe_net_msm3]))
  const bySize = (a: Lifecycle, b: Lifecycle) => (size.get(b.field_id) ?? 0) - (size.get(a.field_id) ?? 0)
  const chosen = [...set.fields].sort(bySize).slice(0, largest)
  for (const f of set.fields) if (picks.includes(f.field_id) && !chosen.includes(f)) chosen.push(f)
  return chosen.sort((a, b) => b.plateau_years - a.plateau_years || bySize(a, b))
}
