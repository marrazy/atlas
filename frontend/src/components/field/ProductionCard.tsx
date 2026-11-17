import { DownloadIcon, RotateCcwIcon, ZoomInIcon } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { ChartCard, LegendItem } from '@/components/ChartCard'
import { ChartToolButton } from '@/components/charts/ChartToolButton'
import { EChart, type EChartHandle } from '@/components/charts/EChart'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProductionMonth } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { productionOption, productionSeries } from '@/lib/charts/production-option'
import { saveChartImage } from '@/lib/charts/save-image'
import type { FitWindow } from '@/lib/decline'
import { fieldSlug } from '@/lib/field'

const CHART_HEIGHT = 470

type Props = {
  fieldName: string
  production: ApiState<ProductionMonth[]>
  /** The months the decline panel fits, shaded on the oil rate chart. */
  fitWindow?: FitWindow | null
}

export function ProductionCard({ fieldName, production, fitWindow = null }: Props) {
  const chart = useRef<EChartHandle>(null)
  const [areaZoom, setAreaZoom] = useState(false)
  const series = useMemo(
    () => (production.status === 'ready' ? productionSeries(production.data) : null),
    [production],
  )
  const option = useMemo(
    () => (series ? productionOption(fieldName, series, fitWindow) : null),
    [fieldName, series, fitWindow],
  )

  const instance = () => chart.current?.getEchartsInstance()

  const setAreaZoomMode = (on: boolean) => {
    instance()?.dispatchAction({ type: 'takeGlobalCursor', key: 'dataZoomSelect', dataZoomSelectActive: on })
    setAreaZoom(on)
  }

  const resetView = () => {
    setAreaZoomMode(false)
    instance()?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
  }

  const saveImage = () => saveChartImage(instance(), `${fieldSlug(fieldName)}-production.png`)

  const actions = option && (
    <>
      <ChartToolButton
        label="Zoom into an area"
        icon={ZoomInIcon}
        pressed={areaZoom}
        onClick={() => setAreaZoomMode(!areaZoom)}
      />
      <ChartToolButton label="Reset view" icon={RotateCcwIcon} onClick={resetView} />
      <ChartToolButton label="Save as image" icon={DownloadIcon} onClick={saveImage} />
    </>
  )

  return (
    <ChartCard
      title="Production"
      description="Gross volumes for the field from Sodir, as a daily average for each month. The two charts share one crosshair, so hovering one shows the same month on both."
      actions={actions}
    >
      {production.status === 'loading' && <Skeleton style={{ height: CHART_HEIGHT }} className="w-full" />}
      {production.status === 'error' && <ErrorNotice message={production.message} />}
      {production.status === 'ready' && !option && (
        <p className="py-10 text-center text-sm text-muted-foreground">No production reported for this field.</p>
      )}
      {option && (
        <>
          <div className="mb-2.5 flex flex-wrap gap-3.5">
            <LegendItem colour={CHART_COLOURS.oil} label="Oil rate" />
            <LegendItem colour={CHART_COLOURS.gas} label="Gas oil ratio" />
          </div>
          <EChart option={option} height={CHART_HEIGHT} chartRef={chart} />
        </>
      )}
    </ChartCard>
  )
}
