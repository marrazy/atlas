import { DownloadIcon, RotateCcwIcon, ZoomInIcon } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { ChartCard } from '@/components/ChartCard'
import { ChartToolButton } from '@/components/charts/ChartToolButton'
import { EChart, type EChartHandle } from '@/components/charts/EChart'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import type { LifecycleSet } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { highlightColour, lifecycleOption } from '@/lib/charts/lifecycle-option'
import { saveChartImage } from '@/lib/charts/save-image'
import { findLifecycle } from '@/lib/lifecycles'

const CHART_HEIGHT = 420

/** A short line sample, so the legend shows width and dashes as well as colour. */
function LegendLine({ colour, width, dashed = false, label }: { colour: string; width: number; dashed?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <svg width="20" height="10" aria-hidden="true">
        <line x1="0" y1="5" x2="20" y2="5" stroke={colour} strokeWidth={width} strokeDasharray={dashed ? '6 4' : undefined} />
      </svg>
      {label}
    </span>
  )
}

type Props = {
  lifecycles: ApiState<LifecycleSet>
  /** The field drawn on top in its product colour. */
  highlightId: number | null
  /** The last full year in the snapshot, the last year the lines reach. */
  lastFullYear: number | null
}

export function LifecycleCard({ lifecycles, highlightId, lastFullYear }: Props) {
  const chart = useRef<EChartHandle>(null)
  const [areaZoom, setAreaZoom] = useState(false)
  const set = lifecycles.status === 'ready' ? lifecycles.data : null
  const highlighted = set ? findLifecycle(set, highlightId) : null
  const option = useMemo(() => (set ? lifecycleOption(set, highlighted) : null), [set, highlighted])

  const instance = () => chart.current?.getEchartsInstance()

  const setAreaZoomMode = (on: boolean) => {
    instance()?.dispatchAction({ type: 'takeGlobalCursor', key: 'dataZoomSelect', dataZoomSelectActive: on })
    setAreaZoom(on)
  }

  const resetView = () => {
    setAreaZoomMode(false)
    instance()?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
  }

  const actions = option && (
    <>
      <ChartToolButton label="Zoom into an area" icon={ZoomInIcon} pressed={areaZoom} onClick={() => setAreaZoomMode(!areaZoom)} />
      <ChartToolButton label="Reset view" icon={RotateCcwIcon} onClick={resetView} />
      <ChartToolButton label="Save as image" icon={DownloadIcon} onClick={() => saveChartImage(instance(), 'field-lifecycles.png')} />
    </>
  )

  return (
    <ChartCard
      title="Production as a share of best year"
      description={`Yearly saleable production in oil equivalent, full years${lastFullYear ? ` up to ${lastFullYear}` : ''}. Each line is one field, lined up at its first year of production.`}
      actions={actions}
    >
      {lifecycles.status === 'loading' && <Skeleton style={{ height: CHART_HEIGHT }} className="w-full" />}
      {lifecycles.status === 'error' && <ErrorNotice message={lifecycles.message} />}
      {option && (
        <>
          <div className="mb-2.5 flex flex-wrap gap-3.5">
            {highlighted && <LegendLine colour={highlightColour(highlighted)} width={3} label={highlighted.name} />}
            <LegendLine colour={CHART_COLOURS.foreground} width={2} dashed label="Median of all fields" />
            <LegendLine colour={CHART_COLOURS.other} width={1} label="Other fields" />
          </div>
          {/* a new highlight is merged into the chart, so the zoom stays; the number of lines never changes, so nothing is left over */}
          <EChart option={option} height={CHART_HEIGHT} chartRef={chart} replace={false} />
        </>
      )}
    </ChartCard>
  )
}
