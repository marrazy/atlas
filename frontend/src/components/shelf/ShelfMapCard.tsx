import { lazy, Suspense } from 'react'
import { useNavigate } from 'react-router'
import { ChartCard, Legend } from '@/components/ChartCard'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import type { FieldSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { producingCount } from '@/lib/map/shelf-map'
import { YearControl } from './YearControl'

// MapLibre is large, so it loads on its own once this card is on screen.
const ShelfMap = lazy(() => import('./ShelfMap'))

const mapPlaceholder = <Skeleton className="h-[464px] w-full rounded-[10px] sm:h-[664px]" />

type Props = {
  fields: ApiState<FieldSummary[]>
  /** The chosen year, or null while the year range is not known yet. */
  year: number | null
  range: [number, number] | null
  onYearChange: (year: number) => void
  className?: string
}

export function ShelfMapCard({ fields, year, range, onYearChange, className }: Props) {
  const navigate = useNavigate()
  const ready = fields.status === 'ready' && year !== null && range !== null

  return (
    <ChartCard title="Fields on the shelf" busy={fields.status !== 'error' && !ready} className={className}>
      {fields.status === 'error' && <ErrorNotice message={fields.message} onRetry={fields.retry} />}
      {fields.status !== 'error' && !ready && mapPlaceholder}
      {ready && (
        <Suspense fallback={mapPlaceholder}>
          <ShelfMap fields={fields.data} year={year} onSelectField={(id) => navigate(`/fields/${id}`)} />
        </Suspense>
      )}
      <div className="mt-4">
        <Legend
          items={[
            { label: 'Mostly oil', swatch: { kind: 'dot', colour: CHART_COLOURS.oil } },
            { label: 'Mostly gas', swatch: { kind: 'dot', colour: CHART_COLOURS.gas } },
            { label: 'Shut down', swatch: { kind: 'ring', colour: CHART_COLOURS.muted } },
          ]}
          unit="Circle size shows total production"
        />
      </div>
      {ready && (
        <YearControl
          year={year}
          min={range[0]}
          max={range[1]}
          onYearChange={onYearChange}
          producing={producingCount(fields.data, year)}
        />
      )}
    </ChartCard>
  )
}
