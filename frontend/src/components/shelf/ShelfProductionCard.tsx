import { DownloadIcon } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { ChartCard } from '@/components/ChartCard'
import { ChartToolButton } from '@/components/charts/ChartToolButton'
import { EChart, type EChartHandle } from '@/components/charts/EChart'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import type { ShelfSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { saveChartImage } from '@/lib/charts/save-image'
import { shelfOption } from '@/lib/charts/shelf-option'

const CHART_HEIGHT = 300

function Swatch({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden="true" className="h-2.5 w-3.5 rounded-xs" style={{ backgroundColor: colour }} />
      {label}
    </span>
  )
}

type Props = {
  shelf: ApiState<ShelfSummary>
  /** The year chosen on the map, marked with a line. */
  year?: number | null
}

export function ShelfProductionCard({ shelf, year = null }: Props) {
  const chart = useRef<EChartHandle>(null)
  const option = useMemo(() => (shelf.status === 'ready' ? shelfOption(shelf.data, year) : null), [shelf, year])

  const actions = option && (
    <ChartToolButton
      label="Save as image"
      icon={DownloadIcon}
      onClick={() => saveChartImage(chart.current?.getEchartsInstance(), 'shelf-production.png')}
    />
  )

  return (
    <ChartCard
      title="Shelf production by year"
      description="Saleable oil and gas, million Sm³ oil equivalent, full years only. Hover for each year."
      actions={actions}
      busy={shelf.status === 'loading'}
    >
      {shelf.status === 'loading' && <Skeleton style={{ height: CHART_HEIGHT }} className="w-full" />}
      {shelf.status === 'error' && <ErrorNotice message={shelf.message} onRetry={shelf.retry} />}
      {option && (
        <>
          <div className="mb-2.5 flex flex-wrap gap-3.5">
            <Swatch colour={CHART_COLOURS.oil} label="Oil, NGL and condensate" />
            <Swatch colour={CHART_COLOURS.gas} label="Gas" />
          </div>
          <EChart option={option} height={CHART_HEIGHT} chartRef={chart} replace={false} />
        </>
      )}
    </ChartCard>
  )
}
