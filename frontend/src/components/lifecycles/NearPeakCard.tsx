import { useMemo } from 'react'
import { ChartCard } from '@/components/ChartCard'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import { LIFECYCLE_PICKS, NEAR_PEAK_LARGEST } from '@/config'
import type { FieldSummary, LifecycleSet } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { findLifecycle, nearPeakFields, nearPeakSentence } from '@/lib/lifecycles'
import { cn } from '@/lib/utils'

type Props = {
  lifecycles: ApiState<LifecycleSet>
  /** For the size of each field, to pick the largest ones. */
  fields: ApiState<FieldSummary[]>
  highlightId: number | null
  className?: string
}

/** Design v2 list: one 28px row per field with its name, a 6px bar and the number of years near peak. */
export function NearPeakCard({ lifecycles, fields, highlightId, className }: Props) {
  const set = lifecycles.status === 'ready' ? lifecycles.data : null
  const list = fields.status === 'ready' ? fields.data : null
  const highlighted = set ? findLifecycle(set, highlightId) : null
  const rows = useMemo(() => (set && list ? nearPeakFields(set, list, LIFECYCLE_PICKS, NEAR_PEAK_LARGEST) : null), [set, list])
  const error = lifecycles.status === 'error' ? lifecycles : fields.status === 'error' ? fields : null
  const most = Math.max(1, ...(rows ?? []).map((f) => f.plateau_years))

  return (
    <ChartCard title="Years within 10% of the best year" busy={!error && !rows} className={className}>
      {error && <ErrorNotice message={error.message} onRetry={error.retry} />}
      {!error && !rows && <Skeleton className="h-[440px] w-full" />}
      {rows && (
        <>
          <ul aria-label="Years within 10% of the best year, by field">
            {rows.map((f) => {
              const on = f.field_id === highlighted?.field_id
              return (
                <li key={f.field_id} className="grid h-7 grid-cols-[112px_1fr_24px] items-center gap-3">
                  <span className={cn('truncate text-[13px]', on ? 'font-medium text-foreground' : 'text-text-2')}>{f.name}</span>
                  <span aria-hidden="true" className="h-1.5 rounded-full bg-raised">
                    <span
                      className={cn('block h-full rounded-full', on ? 'bg-oil' : 'bg-neutral-bar')}
                      style={{ width: `${(f.plateau_years / most) * 100}%` }}
                    />
                  </span>
                  <span className="text-right font-mono text-xs tabular-nums">
                    {f.plateau_years}
                    <span className="sr-only"> {f.plateau_years === 1 ? 'year' : 'years'}</span>
                  </span>
                </li>
              )
            })}
          </ul>
          {highlighted && <p className="mt-4 border-t pt-4 text-[13px] leading-5 text-text-2">{nearPeakSentence(highlighted)}</p>}
        </>
      )}
    </ChartCard>
  )
}
