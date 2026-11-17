import { lazy, Suspense } from 'react'
import { useNavigate } from 'react-router'
import { ChartCard } from '@/components/ChartCard'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import type { FieldSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { MAP_COLOURS } from '@/lib/map/shelf-map'

// MapLibre is large, so it loads on its own once this card is on screen.
const ShelfMap = lazy(() => import('./ShelfMap'))

const mapPlaceholder = <Skeleton className="h-[420px] w-full rounded-[10px] sm:h-[560px]" />

function LegendCircle({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <svg width="12" height="12" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" fill={fill} stroke={stroke} strokeWidth="2" />
    </svg>
  )
}

export function ShelfMapCard({ fields }: { fields: ApiState<FieldSummary[]> }) {
  const navigate = useNavigate()
  const item = 'inline-flex items-center gap-1.5 text-xs text-muted-foreground'

  return (
    <ChartCard
      title="Fields on the shelf"
      description="Each field is a circle at the centre of its outline. Click a field to open its deep dive."
    >
      {fields.status === 'loading' && mapPlaceholder}
      {fields.status === 'error' && <ErrorNotice message={fields.message} />}
      {fields.status === 'ready' && (
        <Suspense fallback={mapPlaceholder}>
          <ShelfMap fields={fields.data} onSelectField={(id) => navigate(`/fields/${id}`)} />
        </Suspense>
      )}
      <div className="mt-2.5 flex flex-wrap gap-3.5">
        <span className={item}>
          <LegendCircle fill={CHART_COLOURS.oil} stroke={CHART_COLOURS.oil} />
          Mostly oil
        </span>
        <span className={item}>
          <LegendCircle fill={CHART_COLOURS.gas} stroke={CHART_COLOURS.gas} />
          Mostly gas
        </span>
        <span className={item}>
          <LegendCircle fill={MAP_COLOURS.sea} stroke={CHART_COLOURS.mutedForeground} />
          Shut down (ring)
        </span>
        <span className={item}>
          <LegendCircle fill={MAP_COLOURS.sea} stroke={CHART_COLOURS.other} />
          No production yet (faint ring)
        </span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">Circle size shows total production to date.</p>
    </ChartCard>
  )
}
