import { DownloadIcon, InfoIcon } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { ChartCard } from '@/components/ChartCard'
import { ChartToolButton } from '@/components/charts/ChartToolButton'
import { EChart, type EChartHandle } from '@/components/charts/EChart'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import { LIFECYCLE_PICKS, NEAR_PEAK_LARGEST } from '@/config'
import type { FieldSummary, LifecycleSet } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { BAR_ROW_HEIGHT, nearPeakOption, nearPeakSentence } from '@/lib/charts/near-peak-option'
import { saveChartImage } from '@/lib/charts/save-image'
import { findLifecycle, nearPeakFields } from '@/lib/lifecycles'

type Props = {
  lifecycles: ApiState<LifecycleSet>
  /** For the size of each field, to pick the largest ones. */
  fields: ApiState<FieldSummary[]>
  highlightId: number | null
}

export function NearPeakCard({ lifecycles, fields, highlightId }: Props) {
  const chart = useRef<EChartHandle>(null)
  const set = lifecycles.status === 'ready' ? lifecycles.data : null
  const list = fields.status === 'ready' ? fields.data : null
  const highlighted = set ? findLifecycle(set, highlightId) : null
  const bars = useMemo(() => (set && list ? nearPeakFields(set, list, LIFECYCLE_PICKS, NEAR_PEAK_LARGEST) : null), [set, list])
  const option = useMemo(() => (bars ? nearPeakOption(bars, highlighted) : null), [bars, highlighted])
  const error = lifecycles.status === 'error' ? lifecycles.message : fields.status === 'error' ? fields.message : null
  const height = (bars?.length ?? NEAR_PEAK_LARGEST) * BAR_ROW_HEIGHT + 8

  const actions = option && (
    <ChartToolButton
      label="Save as image"
      icon={DownloadIcon}
      onClick={() => saveChartImage(chart.current?.getEchartsInstance(), 'years-near-peak.png')}
    />
  )

  return (
    <ChartCard
      title="Years near peak"
      description={`Years within 10% of the best year. The ${NEAR_PEAK_LARGEST} largest fields, plus the fields you can highlight.`}
      actions={actions}
    >
      {error && <ErrorNotice message={error} />}
      {!error && !option && <Skeleton style={{ height }} className="w-full" />}
      {option && (
        <>
          <EChart option={option} height={height} chartRef={chart} replace={false} />
          {highlighted && (
            <p className="mt-3 flex gap-2 text-[13px] leading-normal text-muted-foreground">
              <InfoIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <span>{nearPeakSentence(highlighted)}</span>
            </p>
          )}
        </>
      )}
    </ChartCard>
  )
}
