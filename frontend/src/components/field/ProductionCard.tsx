import { useMemo } from 'react'
import { ChartCard, Legend } from '@/components/ChartCard'
import { EChart } from '@/components/charts/EChart'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProductionMonth } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { productionOption, productionSeries, type ProductionNote } from '@/lib/charts/production-option'

const CHART_HEIGHT = 420

type Props = {
  fieldName: string
  production: ApiState<ProductionMonth[]>
  /** A stretch of months to point out on the oil rate chart, or nothing. */
  note?: ProductionNote | null
}

/** Oil rate on top and gas oil ratio below, sharing one time axis, one crosshair and one zoom bar. */
export function ProductionCard({ fieldName, production, note = null }: Props) {
  const series = useMemo(
    () => (production.status === 'ready' ? productionSeries(production.data) : null),
    [production],
  )
  const option = useMemo(() => (series ? productionOption(fieldName, series, note) : null), [fieldName, series, note])

  return (
    <ChartCard title="Production" busy={production.status === 'loading'}>
      {production.status === 'loading' && <Skeleton style={{ height: CHART_HEIGHT }} className="w-full" />}
      {production.status === 'error' && <ErrorNotice message={production.message} onRetry={production.retry} />}
      {production.status === 'ready' && !option && (
        <p className="py-10 text-center text-sm text-text-2">No production reported for this field</p>
      )}
      {option && (
        <>
          <Legend
            items={[
              { label: 'Oil rate, Sm³/day', swatch: { kind: 'line', colour: CHART_COLOURS.oil } },
              { label: 'Gas oil ratio', swatch: { kind: 'line', colour: CHART_COLOURS.gas } },
            ]}
          />
          <EChart option={option} height={CHART_HEIGHT} />
        </>
      )}
    </ChartCard>
  )
}
