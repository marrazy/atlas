import { DownloadIcon } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { ChartCard } from '@/components/ChartCard'
import { ChartToolButton } from '@/components/charts/ChartToolButton'
import { EChart, type EChartHandle } from '@/components/charts/EChart'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import type { InvestmentYear } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { investmentOption, investmentSeries } from '@/lib/charts/investment-option'
import { saveChartImage } from '@/lib/charts/save-image'
import { fieldSlug } from '@/lib/field'
import { formatNumber } from '@/lib/format'

const CHART_HEIGHT = 240

type Props = { fieldName: string; investments: ApiState<InvestmentYear[]> }

export function InvestmentCard({ fieldName, investments }: Props) {
  const chart = useRef<EChartHandle>(null)
  const series = useMemo(
    () => (investments.status === 'ready' ? investmentSeries(investments.data) : null),
    [investments],
  )
  const option = useMemo(() => (series ? investmentOption(fieldName, series) : null), [fieldName, series])

  const description = series
    ? `Million Norwegian kroner, not adjusted for inflation. ${formatNumber(series.total)} million in total.`
    : 'Million Norwegian kroner, not adjusted for inflation.'

  const actions = option && (
    <ChartToolButton
      label="Save as image"
      icon={DownloadIcon}
      onClick={() => saveChartImage(chart.current?.getEchartsInstance(), `${fieldSlug(fieldName)}-investment.png`)}
    />
  )

  return (
    <ChartCard title="Investment by year" description={description} actions={actions} busy={investments.status === 'loading'}>
      {investments.status === 'loading' && <Skeleton style={{ height: CHART_HEIGHT }} className="w-full" />}
      {investments.status === 'error' && <ErrorNotice message={investments.message} onRetry={investments.retry} />}
      {investments.status === 'ready' && !option && (
        <p className="py-10 text-center text-sm text-muted-foreground">No investment reported for this field.</p>
      )}
      {option && <EChart option={option} height={CHART_HEIGHT} chartRef={chart} />}
    </ChartCard>
  )
}
