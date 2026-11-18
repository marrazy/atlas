import { useMemo } from 'react'
import { ChartCard, Legend } from '@/components/ChartCard'
import { EChart } from '@/components/charts/EChart'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import type { InvestmentYear } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { investmentOption, investmentSeries } from '@/lib/charts/investment-option'

const CHART_HEIGHT = 320

type Props = { fieldName: string; investments: ApiState<InvestmentYear[]> }

export function InvestmentCard({ fieldName, investments }: Props) {
  const series = useMemo(
    () => (investments.status === 'ready' ? investmentSeries(investments.data) : null),
    [investments],
  )
  const option = useMemo(() => (series ? investmentOption(fieldName, series) : null), [fieldName, series])

  return (
    <ChartCard title="Investment by year" busy={investments.status === 'loading'}>
      {investments.status === 'loading' && <Skeleton style={{ height: CHART_HEIGHT }} className="w-full" />}
      {investments.status === 'error' && <ErrorNotice message={investments.message} onRetry={investments.retry} />}
      {investments.status === 'ready' && !option && (
        <p className="py-10 text-center text-sm text-text-2">No investment reported for this field</p>
      )}
      {option && (
        <>
          <Legend items={[]} unit="Million NOK, not adjusted for inflation" />
          <EChart option={option} height={CHART_HEIGHT} />
        </>
      )}
    </ChartCard>
  )
}
