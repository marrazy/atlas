import { StatCard, StatGrid } from '@/components/StatCard'
import type { FieldSummary, ShelfSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { formatNumber } from '@/lib/format'
import { gasShare } from '@/lib/shelf'

type Props = {
  shelf: ApiState<ShelfSummary>
  fields: ApiState<FieldSummary[]>
}

export function ShelfStats({ shelf, fields }: Props) {
  const s = shelf.status === 'ready' ? shelf.data : null
  // a failed load shows a plain word instead of a placeholder that would look like it is still loading
  const missing = 'Not available'
  const shelfValue = (value: (data: ShelfSummary) => string) => (s ? value(s) : shelf.status === 'error' ? missing : undefined)
  const firstYear = s?.years[0]?.year
  const share = s ? gasShare(s) : null

  return (
    <StatGrid>
      <StatCard
        label="Producing fields"
        value={shelfValue((d) => String(d.producing_fields_now))}
        note={fields.status === 'ready' ? `Of ${fields.data.length} fields on the shelf` : 'Current status at Sodir'}
      />
      <StatCard
        label={firstYear ? `Produced since ${firstYear}` : 'Produced in total'}
        value={shelfValue((d) => `${formatNumber(d.total_oe_net_msm3 / 1000, 1)} bn Sm³`)}
        note="Oil equivalent, all fields"
      />
      <StatCard
        label="Peak year"
        tint="oil"
        value={shelfValue((d) => String(d.peak_year))}
        note={s ? `${formatNumber(s.peak_oe_net_msm3)} million Sm³ o.e.` : undefined}
      />
      <StatCard
        label="Gas share of output"
        tint="gas"
        dot
        value={shelfValue(() => (share ? `${formatNumber(share.last.percent)}%` : missing))}
        note={share ? `In ${share.last.year}, vs ${formatNumber(share.peak.percent)}% in ${share.peak.year}` : undefined}
      />
    </StatGrid>
  )
}
