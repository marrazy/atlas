import { useMemo } from 'react'
import { ChartCard, Legend } from '@/components/ChartCard'
import { EChart } from '@/components/charts/EChart'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompact } from '@/hooks/use-compact'
import type { LifecycleSet } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { lifecycleOption } from '@/lib/charts/lifecycle-option'
import { findLifecycle } from '@/lib/lifecycles'

const CHART_HEIGHT = 300

type Props = {
  lifecycles: ApiState<LifecycleSet>
  /** The field drawn on top as an oil line. */
  highlightId: number | null
  className?: string
}

export function LifecycleCard({ lifecycles, highlightId, className }: Props) {
  const set = lifecycles.status === 'ready' ? lifecycles.data : null
  const highlighted = set ? findLifecycle(set, highlightId) : null
  const compact = useCompact()
  const option = useMemo(() => (set ? lifecycleOption(set, highlighted, compact) : null), [set, highlighted, compact])

  return (
    <ChartCard title="Production as a share of the best year" busy={lifecycles.status === 'loading'} className={className}>
      {lifecycles.status === 'loading' && <Skeleton style={{ height: CHART_HEIGHT }} className="w-full" />}
      {lifecycles.status === 'error' && <ErrorNotice message={lifecycles.message} onRetry={lifecycles.retry} />}
      {option && (
        <>
          <Legend
            items={[
              { label: 'Selected field', swatch: { kind: 'line', colour: CHART_COLOURS.oil, width: 2 } },
              { label: 'Median of all fields', swatch: { kind: 'line', colour: CHART_COLOURS.text, dashed: true, width: 2 } },
              { label: 'Other fields', swatch: { kind: 'line', colour: CHART_COLOURS.otherLine } },
            ]}
            unit="Share of each field's best year"
          />
          {/* a new highlight is merged into the chart; the number of lines never changes, so nothing is left over */}
          <EChart option={option} height={CHART_HEIGHT} replace={false} />
        </>
      )}
    </ChartCard>
  )
}
