import { CircleAlertIcon, InfoIcon } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { ChartCard } from '@/components/ChartCard'
import { EChart } from '@/components/charts/EChart'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fitDecline } from '@/lib/api/client'
import type { DeclineModel, DeclineResult, FieldDetail, ProductionMonth } from '@/lib/api/types'
import { useApi } from '@/lib/api/use-api'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { declineOption } from '@/lib/charts/decline-option'
import {
  DECLINE_MODELS,
  ECONOMIC_LIMIT,
  FORECAST_MONTHS,
  WEAK_FIT_R2,
  describeB,
  describeTimeToLimit,
  type FitWindow,
} from '@/lib/decline'
import { formatMonth, formatNumber } from '@/lib/format'

const CHART_HEIGHT = 300

function Legend() {
  const line = (dashed: boolean) => (
    <svg width="20" height="10" aria-hidden="true">
      <line x1="0" y1="5" x2="20" y2="5" stroke={CHART_COLOURS.gas} strokeWidth="2" strokeDasharray={dashed ? '4 3' : undefined} />
    </svg>
  )
  const item = 'inline-flex items-center gap-1.5 text-xs text-muted-foreground'
  return (
    <div className="mb-2.5 flex flex-wrap gap-3.5">
      <span className={item}>
        <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: CHART_COLOURS.oil }} />
        Monthly oil rate, Sm³/day
      </span>
      <span className={item}>
        <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: CHART_COLOURS.other }} />
        Outside the fit window
      </span>
      <span className={item}>{line(false)}Fitted curve</span>
      <span className={item}>{line(true)}Forecast</span>
      <span className={item}>
        <span aria-hidden="true" className="h-2 w-5 rounded-sm opacity-25" style={{ backgroundColor: CHART_COLOURS.gas }} />
        Forecast range
      </span>
    </div>
  )
}

function SideBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[10px] border bg-background p-3.5">
      <h3 className="text-xs font-normal text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

function FitDetails({ field, result }: { field: FieldDetail; result: DeclineResult }) {
  const weak = result.r2 < WEAK_FIT_R2
  const note = DECLINE_MODELS.find((m) => m.value === result.model)?.note
  const title = field.status === 'Shut down' ? `If ${field.name} had kept running` : `If ${field.name} keeps declining like this`

  return (
    <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-2.5">
      <SideBox title="Fitted parameters">
        <p className="mt-1.5 text-[13px]">{describeB(result)}</p>
        <p className="mt-1 font-mono text-[13px]">qi = {formatNumber(result.qi)} Sm³/day</p>
        <p className="mt-1 font-mono text-[13px]">Di = {formatNumber(result.di_annual_pct, 1)}% a year</p>
        <p className="mt-1 font-mono text-[13px] text-muted-foreground">
          R² = {formatNumber(result.r2, 2)}, {result.months_used} months
        </p>
      </SideBox>
      <SideBox title={title}>
        <p className="mt-1.5 text-[22px] font-bold tracking-heading">About {formatNumber(result.remaining_mmbbl, 1)} MMbbl more</p>
        <p className="mt-1 text-[13px] leading-normal text-muted-foreground">{describeTimeToLimit(result.months_to_limit)}</p>
      </SideBox>
      {weak && (
        <p role="note" className="flex gap-2 text-xs leading-normal text-foreground">
          <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          This window does not follow a clear decline (R² {formatNumber(result.r2, 2)}), so treat this forecast as very rough.
        </p>
      )}
      {note && (
        <p className="flex gap-2 text-xs leading-normal text-muted-foreground">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {note}
        </p>
      )}
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
    <div className="flex flex-wrap gap-5" aria-busy={fit.status === 'loading'}>
      {fit.status === 'loading' && <p className="sr-only">Loading</p>}
      <div className="min-w-0 flex-[3_1_440px]">
        <Legend />
        {option ? <EChart option={option} height={CHART_HEIGHT} /> : <Skeleton style={{ height: CHART_HEIGHT }} className="w-full" />}
      </div>
      {fit.status === 'ready' ? (
        <FitDetails field={field} result={fit.data} />
      ) : (
        <Skeleton className="h-60 min-w-0 flex-[1_1_220px]" />
      )}
    </div>
  )
}

type Props = { field: FieldDetail; months: ProductionMonth[]; window: FitWindow | null }

export function DeclineCard({ field, months, window }: Props) {
  const [model, setModel] = useState<DeclineModel>('hyperbolic')

  if (!window) {
    return (
      <ChartCard title="Decline curve forecast">
        <p className="py-6 text-center text-sm text-muted-foreground">
          Too little oil to fit a decline curve. No month reached the {ECONOMIC_LIMIT} Sm³/day example limit.
        </p>
      </ChartCard>
    )
  }

  const description = `Arps model fitted to the real oil rate from ${formatMonth(window.start, 'long')} to ${formatMonth(window.end, 'long')}. The window starts at the highest month in the two years before it ends, and ends at the last month above the economic limit.`

  return (
    <Tabs value={model} onValueChange={(value) => setModel(value as DeclineModel)}>
      <ChartCard
        title="Decline curve forecast"
        description={description}
        actions={
          <TabsList aria-label="Decline model" className="h-auto rounded-[10px] p-1">
            {DECLINE_MODELS.map((m) => (
              <TabsTrigger
                key={m.value}
                value={m.value}
                className="min-h-9 rounded-md px-3.5 text-[13px] dark:data-active:border-transparent dark:data-active:bg-background"
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
