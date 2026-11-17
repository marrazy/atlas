import { DownloadIcon, RotateCcwIcon, ZoomInIcon, type LucideIcon } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { ChartCard, LegendItem } from '@/components/ChartCard'
import { EChart, type EChartHandle } from '@/components/charts/EChart'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProductionMonth } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { productionOption, productionSeries } from '@/lib/charts/production-option'
import type { FitWindow } from '@/lib/decline'
import { fieldSlug } from '@/lib/field'

const CHART_HEIGHT = 470

type ToolButtonProps = { label: string; icon: LucideIcon; onClick: () => void; pressed?: boolean }

function ToolButton({ label, icon: Icon, onClick, pressed }: ToolButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      className="size-8 text-muted-foreground hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground"
    >
      <Icon aria-hidden="true" />
    </Button>
  )
}

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

  const saveImage = () => {
    const url = instance()?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: CHART_COLOURS.card })
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = `${fieldSlug(fieldName)}-production.png`
    link.click()
  }

  const actions = option && (
    <>
      <ToolButton
        label="Zoom into an area"
        icon={ZoomInIcon}
        pressed={areaZoom}
        onClick={() => setAreaZoomMode(!areaZoom)}
      />
      <ToolButton label="Reset view" icon={RotateCcwIcon} onClick={resetView} />
      <ToolButton label="Save as image" icon={DownloadIcon} onClick={saveImage} />
    </>
  )

  return (
    <ChartCard
      title="Production"
      description="Gross volumes summed from the wells, monthly average per day. The two charts share one crosshair, so hovering one shows the same month on both."
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
