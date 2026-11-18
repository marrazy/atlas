import { StatCard, StatGrid } from '@/components/StatCard'
import { VOLVE_ID, VOLVE_RECOVERY_PERCENT } from '@/config'
import type { FieldDetail, ProductionMonth } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { producingLifeYears, productionSpan } from '@/lib/field'
import { formatMonth, formatNumber } from '@/lib/format'
import { SM3_TO_BBL } from '@/lib/units'

type Props = {
  detail: ApiState<FieldDetail>
  production: ApiState<ProductionMonth[]>
}

type Shown = { value?: string; note?: string }

/** Producing life from the monthly data. If that fails to load, fall back to the years in the field record. */
function producingLife(field: FieldDetail, production: ApiState<ProductionMonth[]>): Shown {
  if (production.status === 'loading') return {}
  if (production.status === 'error') {
    const first = field.first_production_year
    const last = field.last_production_year ?? field.producing_years.at(-1)
    return first && last ? { value: `${last - first + 1} years`, note: `${first} to ${last}, the monthly data did not load` } : { value: 'Not available' }
  }
  const span = productionSpan(production.data)
  if (!span) return { value: 'None', note: 'No production reported' }
  return {
    value: `${formatNumber(producingLifeYears(span), 1)} years`,
    note: `${formatMonth(span.first)} to ${formatMonth(span.last)}`,
  }
}

/** The four stat cards of design v2, section 6. The recovery rate is from Equinor, so only Volve has it. */
export function FieldStats({ detail, production }: Props) {
  if (detail.status !== 'ready') {
    return (
      <StatGrid>
        <StatCard label="Producing life" />
        <StatCard label="Total oil" tint="oil" dot />
        <StatCard label="Peak rate" />
        <StatCard label="Discovered" />
      </StatGrid>
    )
  }

  const field = detail.data
  const life = producingLife(field, production)
  const { peak_oil_rate: peakRate, peak_oil_month: peakMonth } = field
  const peak =
    peakRate !== null && peakMonth !== null
      ? { value: formatNumber(peakRate * SM3_TO_BBL), note: `Barrels a day, ${formatMonth(peakMonth)}` }
      : { value: 'None', note: 'No oil reported' }

  return (
    <StatGrid>
      <StatCard label="Producing life" value={life.value} note={life.note} />
      <StatCard
        label="Total oil"
        tint="oil"
        dot
        value={`${formatNumber(field.total_oil_gross_mmbbl, 1)} MMbbl`}
        note={field.total_oil_gross_mmbbl > 0 ? 'Million barrels, gross' : 'No oil reported'}
      />
      <StatCard label="Peak rate" value={peak.value} note={peak.note} />
      {field.field_id === VOLVE_ID ? (
        <StatCard label="Recovery rate" value={`${VOLVE_RECOVERY_PERCENT}%`} note="Of oil in place, as reported by Equinor" />
      ) : (
        <StatCard
          label="Discovered"
          value={field.discovery_year === null ? 'Not in the data' : String(field.discovery_year)}
          note="Discovery year, from Sodir"
        />
      )}
    </StatGrid>
  )
}
