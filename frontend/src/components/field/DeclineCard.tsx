import { useMemo, useState } from 'react'
import { ChartCard, Legend } from '@/components/ChartCard'
import { EChart } from '@/components/charts/EChart'
import { ErrorNotice } from '@/components/ErrorNotice'
import { SEGMENT_BUTTON, SEGMENT_TRACK } from '@/components/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VOLVE_ID } from '@/config'
import { fitDecline } from '@/lib/api/client'
import type { DeclineModel, DeclineResult, FieldDetail, ProductionMonth } from '@/lib/api/types'
import { useApi } from '@/lib/api/use-api'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { declineOption } from '@/lib/charts/decline-option'
import {
  DECLINE_MODELS,
  ECONOMIC_LIMIT,
  FORECAST_MONTHS,
  VOLVE_MODEL_NOTES,
  WEAK_FIT_R2,
  describeBLimit,
  describeTimeToLimit,
  formatB,
  type FitWindow,
} from '@/lib/decline'
import { formatNumber } from '@/lib/format'

const CHART_HEIGHT = 320

const LEGEND = [
  { label: 'Monthly oil rate', swatch: { kind: 'dot' as const, colour: CHART_COLOURS.oil } },
  { label: 'Fitted curve', swatch: { kind: 'line' as const, colour: CHART_COLOURS.gas } },
  { label: 'Forecast', swatch: { kind: 'line' as const, colour: CHART_COLOURS.gas, dashed: true } },
  { label: 'Forecast range', swatch: { kind: 'band' as const, colour: CHART_COLOURS.gas } },
]

/** The side panel: fitted values, what is left if the field had kept running, and a note on the model. */
function FitDetails({ field, result }: { field: FieldDetail; result: DeclineResult }) {
  const limitNote = describeBLimit(result)
  const note = field.field_id === VOLVE_ID ? VOLVE_MODEL_NOTES[result.model] : DECLINE_MODELS.find((m) => m.value === result.model)?.note
  const title = field.status === 'Shut down' ? `If ${field.name} had kept running` : `If ${field.name} keeps declining like this`
  const row = (name: string, value: string) => (
    <>
      <dt className="text-muted-foreground">{name}</dt>
      <dd>{value}</dd>
    </>
  )

  return (
    <div className="flex min-w-0 flex-[2_1_240px] flex-col gap-4 text-[13px] leading-5">
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-normal text-muted-foreground">Fitted values</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono">
          {row('qi', `${formatNumber(result.qi)} Sm³/day`)}
          {row('Di', `${formatNumber(result.di_annual_pct, 1)}% a year`)}
          {row('b', formatB(result))}
          {row('R²', formatNumber(result.r2, 2))}
        </dl>
        {limitNote && <p className="text-text-2">{limitNote}</p>}
        {result.r2 < WEAK_FIT_R2 && (
          <p role="note" className="text-text-2">
            This window does not follow a clear decline, so treat this forecast as very rough
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 border-t pt-4">
        <h3 className="text-xs font-normal text-muted-foreground">{title}</h3>
        <p className="text-2xl leading-none font-medium tabular-nums">{formatNumber(result.remaining_mmbbl, 1)} MMbbl</p>
        <p className="text-text-2">{describeTimeToLimit(result.months_to_limit)}</p>
      </div>
      {note && <p className="border-t pt-4 text-text-2">{note}</p>}
    </div>
  )
}

type BodyProps = { field: FieldDetail; months: ProductionMonth[]; window: FitWindow; model: DeclineModel }

function DeclineBody({ field, months, window, model }: BodyProps) {
  const request = {
    field_id: field.field_id,
    start: window.start,
    end: window.end,
    model,
    forecast_months: FORECAST_MONTHS,
    economic_limit: ECONOMIC_LIMIT,
  }
  const fit = useApi(`decline:${field.field_id}:${window.start}:${window.end}:${model}`, (signal) =>
    fitDecline(request, { signal }),
  )
  const shutDown = field.status === 'Shut down' ? months[months.length - 1].month : null
  const option = useMemo(
    () => (fit.status === 'ready' ? declineOption({ fieldName: field.name, months, window, result: fit.data, shutDown }) : null),
    [fit, field.name, months, window, shutDown],
  )

  if (fit.status === 'error') return <ErrorNotice message={fit.message} onRetry={fit.retry} />

  return (
    <div aria-busy={fit.status === 'loading'}>
      {fit.status === 'loading' && <p className="sr-only">Loading</p>}
      <Legend items={LEGEND} unit="Oil rate, Sm³/day, log scale" />
      <div className="flex flex-wrap gap-8">
        <div className="min-w-0 flex-[3_1_440px]">
          {option ? <EChart option={option} height={CHART_HEIGHT} /> : <Skeleton style={{ height: CHART_HEIGHT }} className="w-full" />}
        </div>
        {fit.status === 'ready' ? (
          <FitDetails field={field} result={fit.data} />
        ) : (
          <Skeleton className="h-60 min-w-0 flex-[2_1_240px]" />
        )}
      </div>
    </div>
  )
}

type Props = { field: FieldDetail; months: ProductionMonth[]; window: FitWindow | null }

export function DeclineCard({ field, months, window }: Props) {
  // design v2 opens on exponential, the best fit for Volve's decline
  const [model, setModel] = useState<DeclineModel>('exponential')

  if (!window) {
    return (
      <ChartCard title="Decline curve">
        <p className="py-6 text-center text-sm text-text-2">
          Too little oil to fit a decline curve. No month reached the {ECONOMIC_LIMIT} Sm³/day example limit
        </p>
      </ChartCard>
    )
  }

  return (
    <Tabs value={model} onValueChange={(value) => setModel(value as DeclineModel)}>
      <ChartCard
        title="Decline curve"
        actions={
          <TabsList aria-label="Decline model" className={SEGMENT_TRACK}>
            {DECLINE_MODELS.map((m) => (
              <TabsTrigger
                key={m.value}
                value={m.value}
                className={`${SEGMENT_BUTTON} flex-none border-0 text-text-2 after:hidden hover:text-foreground data-active:bg-card data-active:text-foreground data-active:shadow-[0_1px_2px_rgba(0,0,0,0.08)]`}
              >
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
        }
      >
        {DECLINE_MODELS.map((m) => (
          <TabsContent key={m.value} value={m.value}>
            <DeclineBody field={field} months={months} window={window} model={m.value} />
          </TabsContent>
        ))}
      </ChartCard>
    </Tabs>
  )
}
