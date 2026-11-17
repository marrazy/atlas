import { lazy, Suspense } from 'react'
import { useNavigate } from 'react-router'
import { ChartCard } from '@/components/ChartCard'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import type { FieldSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { MAP_COLOURS, producingCount, producingNotMapped } from '@/lib/map/shelf-map'
import { YearControl } from './YearControl'

// MapLibre is large, so it loads on its own once this card is on screen.
const ShelfMap = lazy(() => import('./ShelfMap'))

const mapPlaceholder = <Skeleton className="h-[420px] w-full rounded-[10px] sm:h-[560px]" />

function LegendCircle({ fill, stroke, faint = false }: { fill: string; stroke: string; faint?: boolean }) {
  return (
    <svg width="12" height="12" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" fill={fill} stroke={stroke} strokeWidth={faint ? 1 : 2} strokeOpacity={faint ? 0.5 : 1} />
    </svg>
  )
}

type Props = {
  fields: ApiState<FieldSummary[]>
  /** The chosen year, or null while the year range is not known yet. */
  year: number | null
  range: [number, number] | null
  onYearChange: (year: number) => void
}

export function ShelfMapCard({ fields, year, range, onYearChange }: Props) {
  const navigate = useNavigate()
  const item = 'inline-flex items-center gap-1.5 text-xs text-muted-foreground'
  const ready = fields.status === 'ready' && year !== null && range !== null

  return (
    <ChartCard
      title="Fields on the shelf"
      description="Each field is a circle at the centre of its outline. Drag the year or press play to see which fields were producing. Click a field to open its deep dive."
    >
      {fields.status === 'error' && <ErrorNotice message={fields.message} />}
      {fields.status !== 'error' && !ready && mapPlaceholder}
      {ready && (
        <Suspense fallback={mapPlaceholder}>
          <ShelfMap fields={fields.data} year={year} onSelectField={(id) => navigate(`/fields/${id}`)} />
        </Suspense>
      )}
      <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5">
        <span className={item}>
          <LegendCircle fill={CHART_COLOURS.oil} stroke={CHART_COLOURS.oil} />
          Mostly oil
        </span>
        <span className={item}>
          <LegendCircle fill={CHART_COLOURS.gas} stroke={CHART_COLOURS.gas} />
          Mostly gas
        </span>
        <span className={item}>
          <LegendCircle fill={CHART_COLOURS.mutedForeground} stroke={CHART_COLOURS.mutedForeground} />
          Filled: produced that year
        </span>
        <span className={item}>
          <LegendCircle fill={MAP_COLOURS.sea} stroke={CHART_COLOURS.mutedForeground} />
          Ring: had stopped
        </span>
        <span className={item}>
          <LegendCircle fill={MAP_COLOURS.sea} stroke={CHART_COLOURS.mutedForeground} faint />
          Faint ring: not started yet
        </span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">Circle size shows total production to date.</p>
      {ready && (
        <YearControl
          year={year}
          min={range[0]}
          max={range[1]}
          onYearChange={onYearChange}
          producing={producingCount(fields.data, year)}
          notMapped={producingNotMapped(fields.data, year)}
        />
      )}
    </ChartCard>
  )
}
