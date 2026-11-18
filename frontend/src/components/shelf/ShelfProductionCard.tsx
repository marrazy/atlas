import { useMemo } from 'react'
import { ChartCard, Legend } from '@/components/ChartCard'
import { EChart } from '@/components/charts/EChart'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompact } from '@/hooks/use-compact'
import type { ShelfSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { shelfOption } from '@/lib/charts/shelf-option'

const CHART_HEIGHT = 240

type Props = {
  shelf: ApiState<ShelfSummary>
  /** The year chosen on the map, marked with a line. */
  year?: number | null
}

export function ShelfProductionCard({ shelf, year = null }: Props) {
  const compact = useCompact()
  const option = useMemo(
    () => (shelf.status === 'ready' ? shelfOption(shelf.data, year, compact) : null),
    [shelf, year, compact],
  )

  return (
    <ChartCard title="Shelf production by year" busy={shelf.status === 'loading'}>
      {shelf.status === 'loading' && <Skeleton style={{ height: CHART_HEIGHT }} className="w-full" />}
      {shelf.status === 'error' && <ErrorNotice message={shelf.message} onRetry={shelf.retry} />}
      {option && (
        <>
          <Legend
            items={[
              { label: 'Oil, NGL and condensate', swatch: { kind: 'square', colour: CHART_COLOURS.oil } },
              { label: 'Gas', swatch: { kind: 'square', colour: CHART_COLOURS.gas } },
            ]}
            unit="Million Sm³ o.e."
          />
          <EChart option={option} height={CHART_HEIGHT} replace={false} />
        </>
      )}
    </ChartCard>
  )
}
