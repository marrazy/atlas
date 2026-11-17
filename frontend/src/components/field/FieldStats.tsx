import { CalendarIcon, CylinderIcon, GaugeIcon, TrendingUpIcon } from 'lucide-react'
import { StatCard, StatGrid } from '@/components/StatCard'
import { VOLVE_ID, VOLVE_RECOVERY_PERCENT } from '@/config'
import type { FieldDetail, ProductionMonth } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { productionSpan } from '@/lib/field'
import { formatMonth, formatNumber } from '@/lib/format'
import { SM3_TO_BBL } from '@/lib/units'

type Props = {
  detail: ApiState<FieldDetail>
  production: ApiState<ProductionMonth[]>
}

type Shown = { value?: string; note?: string }

/** First and last month come from the monthly data. If that fails to load, fall back to the years in the field record. */
function productionMonths(field: FieldDetail, production: ApiState<ProductionMonth[]>): { first: Shown; last: Shown } {
  if (production.status === 'loading') return { first: {}, last: {} }

  if (production.status === 'error') {
    const note = 'Year only, the monthly data did not load'
    return {
      first: { value: String(field.first_production_year ?? 'None'), note },
      last: { value: String(field.last_production_year ?? field.producing_years.at(-1) ?? 'None'), note },
    }
  }

  const span = productionSpan(production.data)
  if (!span) {
    const none = { value: 'None', note: 'No production reported' }
    return { first: none, last: none }
  }

  const lastNote =
    field.status === 'Shut down' ? 'Field shut down' : field.status === 'Producing' ? 'Still producing' : 'Last month with output'
  return {
    first: { value: formatMonth(span.first), note: 'First month with output' },
    last: { value: formatMonth(span.last), note: lastNote },
  }
}

export function FieldStats({ detail, production }: Props) {
  if (detail.status !== 'ready') {
    return (
      <StatGrid>
        <StatCard label="First production" icon={CalendarIcon} />
        <StatCard label="Last production" icon={CalendarIcon} />
        <StatCard label="Total oil" icon={CylinderIcon} />
        <StatCard label="Peak rate" icon={TrendingUpIcon} />
      </StatGrid>
    )
  }

  const field = detail.data
  const { first, last } = productionMonths(field, production)
  const { peak_oil_rate: peakRate, peak_oil_month: peakMonth } = field
  const peak =
    peakRate !== null && peakMonth !== null
      ? { value: formatNumber(peakRate * SM3_TO_BBL), note: `Barrels a day, ${formatMonth(peakMonth)}` }
      : { value: 'None', note: 'No oil reported' }

  return (
    <StatGrid>
      <StatCard label="First production" icon={CalendarIcon} value={first.value} note={first.note} />
      <StatCard label="Last production" icon={CalendarIcon} value={last.value} note={last.note} />
      <StatCard
        label="Total oil"
        icon={CylinderIcon}
        value={`${formatNumber(field.total_oil_gross_mmbbl, 1)} MMbbl`}
        note={field.total_oil_gross_mmbbl > 0 ? 'Million barrels, from Sodir' : 'No oil reported'}
      />
      <StatCard label="Peak rate" icon={TrendingUpIcon} value={peak.value} note={peak.note} />
      {field.field_id === VOLVE_ID && (
        <StatCard
          label="Recovery rate"
          icon={GaugeIcon}
          value={`${VOLVE_RECOVERY_PERCENT}%`}
          note="Oil in place recovered, per Equinor"
        />
      )}
    </StatGrid>
  )
}
