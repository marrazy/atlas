import { CylinderIcon, GaugeIcon, MapPinIcon, TrendingUpIcon } from 'lucide-react'
import { StatCard, StatGrid } from '@/components/StatCard'
import type { FieldSummary, ShelfSummary, Snapshot } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { formatMonth, formatNumber } from '@/lib/format'
import { fieldCounts, type FieldCounts } from '@/lib/shelf'

type Props = {
  shelf: ApiState<ShelfSummary>
  fields: ApiState<FieldSummary[]>
  snapshot: ApiState<Snapshot>
}

export function ShelfStats({ shelf, fields, snapshot }: Props) {
  const s = shelf.status === 'ready' ? shelf.data : null
  const counts = fields.status === 'ready' ? fieldCounts(fields.data) : null
  // a failed load shows a plain word instead of a placeholder that would look like it is still loading
  const missing = 'Not available'
  const shelfValue = (value: (data: ShelfSummary) => string) => (s ? value(s) : shelf.status === 'error' ? missing : undefined)
  const countValue = (value: (data: FieldCounts) => string) =>
    counts ? value(counts) : fields.status === 'error' ? missing : undefined
  const firstYear = s?.years[0]?.year

  // the total includes the unfinished current year, so say how far it goes
  const totalNote =
    snapshot.status === 'ready'
      ? `Oil equivalent, all fields, up to ${formatMonth(snapshot.data.last_month)}`
      : 'Oil equivalent, all fields'

  return (
    <StatGrid>
      <StatCard
        label="Producing fields"
        icon={GaugeIcon}
        value={shelfValue((d) => String(d.producing_fields_now))}
        note="Current status at Sodir"
      />
      <StatCard
        label={firstYear ? `Produced since ${firstYear}` : 'Produced in total'}
        icon={CylinderIcon}
        value={shelfValue((d) => `${formatNumber(d.total_oe_net_msm3 / 1000, 1)} bn Sm³`)}
        note={totalNote}
      />
      <StatCard
        label="Peak year"
        icon={TrendingUpIcon}
        value={shelfValue((d) => String(d.peak_year))}
        note={s ? `${formatNumber(s.peak_oe_net_msm3)} million Sm³ o.e.` : undefined}
      />
      <StatCard
        label="Fields mapped"
        icon={MapPinIcon}
        value={countValue((d) => String(d.mapped))}
        note={counts ? `Including ${counts.mappedNotProducedYet} with no production yet` : undefined}
      />
    </StatGrid>
  )
}
