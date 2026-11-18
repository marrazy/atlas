import { StatCard, StatGrid } from '@/components/StatCard'
import { LIFECYCLE_MIN_CUM, LIFECYCLE_MIN_YEARS } from '@/config'
import type { LifecycleSet } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { formatNumber } from '@/lib/format'
import { lifecycleStats } from '@/lib/lifecycles'

/** A median of an even number of fields can end in .5, so one decimal is kept only then. */
const formatMedian = (value: number) => formatNumber(value, Number.isInteger(value) ? 0 : 1)

export function LifecycleStats({ lifecycles }: { lifecycles: ApiState<LifecycleSet> }) {
  const stats = lifecycles.status === 'ready' ? lifecycleStats(lifecycles.data) : null
  // a failed load shows a plain word instead of a placeholder that would look like it is still loading
  const show = (value: (s: NonNullable<typeof stats>) => string) =>
    stats ? value(stats) : lifecycles.status === 'error' ? 'Not available' : undefined

  return (
    <StatGrid>
      <StatCard
        label="Fields compared"
        value={show((s) => String(s.compared))}
        note={`At least ${LIFECYCLE_MIN_CUM} million Sm³ o.e. and ${LIFECYCLE_MIN_YEARS} full years`}
      />
      <StatCard
        label="Typical best year"
        value={show((s) => (s.bestAge === null ? 'No data' : `Year ${formatMedian(s.bestAge)}`))}
        note="Median years from first production to the best year"
      />
      <StatCard
        label="Typical time near peak"
        value={show((s) =>
          s.nearPeakYears === null ? 'No data' : `${formatMedian(s.nearPeakYears)} ${s.nearPeakYears === 1 ? 'year' : 'years'}`,
        )}
        note="Median years within 10% of the best year"
      />
    </StatGrid>
  )
}
