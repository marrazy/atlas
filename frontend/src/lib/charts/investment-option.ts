import type { InvestmentYear } from '@/lib/api/types'
import { formatCompact, formatNumber } from '@/lib/format'
import { CHART_COLOURS as C, CHART_FONTS as F } from './colours'

/** How many of the biggest years get their value written on top of the bar, like the design. */
const LABELLED_BARS = 2

export type InvestmentSeries = {
  years: number[]
  /** Million NOK. Empty for a year with no investment reported. */
  values: (number | null)[]
  total: number
}

/**
 * One slot per year from the first to the last year with investment. Sodir's data only has years with
 * investment above zero, so a year missing in between is shown as an empty slot, not as a measured zero.
 */
export function investmentSeries(rows: InvestmentYear[]): InvestmentSeries | null {
  if (rows.length === 0) return null
  const byYear = new Map(rows.map((r) => [r.year, r.investment_mnok]))
  const first = rows[0].year
  const last = rows[rows.length - 1].year
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i)
  return {
    years,
    values: years.map((year) => byYear.get(year) ?? null),
    total: rows.reduce((sum, r) => sum + r.investment_mnok, 0),
  }
}

export function describeInvestment(fieldName: string, s: InvestmentSeries): string {
  return `Bar chart of ${fieldName} investment by year in million Norwegian kroner, ${s.years[0]} to ${s.years.at(-1)}, ${formatNumber(s.total)} million in total.`
}

export function investmentTooltip(params: { name: string; value: number | null }[]): string {
  const bar = params[0]
  if (!bar) return ''
  const text = bar.value === null || bar.value === undefined ? 'no investment reported' : `${formatNumber(bar.value)} million NOK`
  return `<div style="font-weight:600">${bar.name}</div><div style="color:${C.mutedForeground}">${text}</div>`
}

export function investmentOption(fieldName: string, s: InvestmentSeries) {
  const biggest = new Set(
    s.values
      .map((value, i) => ({ value: value ?? -1, i }))
      .sort((a, b) => b.value - a.value)
      .slice(0, LABELLED_BARS)
      .filter((bar) => bar.value > 0)
      .map((bar) => bar.i),
  )
  const axisText = { color: C.mutedForeground, fontFamily: F.mono, fontSize: 11 }

  return {
    animationDuration: 400,
    aria: { enabled: true, label: { description: describeInvestment(fieldName, s) } },
    textStyle: { fontFamily: F.sans, color: C.foreground },
    grid: { left: 56, right: 16, top: 30, bottom: 28 },
    xAxis: {
      type: 'category' as const,
      data: s.years.map(String),
      axisLine: { lineStyle: { color: C.border } },
      axisTick: { show: false },
      axisLabel: { ...axisText, hideOverlap: true },
    },
    yAxis: {
      type: 'value' as const,
      name: 'Million NOK',
      nameTextStyle: { color: C.mutedForeground, fontFamily: F.sans, fontSize: 11, align: 'left' as const },
      nameGap: 12,
      axisLabel: { ...axisText, formatter: formatCompact },
      splitLine: { lineStyle: { color: C.border, type: [3, 3] } },
    },
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const, shadowStyle: { color: 'rgba(235, 229, 222, 0.05)' } },
      backgroundColor: C.background,
      borderColor: C.border,
      textStyle: { color: C.foreground, fontFamily: F.sans, fontSize: 12 },
      formatter: investmentTooltip,
    },
    series: [
      {
        name: 'Investment',
        type: 'bar' as const,
        barMaxWidth: 36,
        itemStyle: { color: C.mutedForeground, borderRadius: [4, 4, 0, 0] },
        data: s.values.map((value, i) => ({
          value,
          label: {
            show: biggest.has(i),
            position: 'top' as const,
            color: C.foreground,
            fontFamily: F.sans,
            fontSize: 11,
            formatter: () => (value === null ? '' : formatNumber(value)),
          },
        })),
      },
    ],
  }
}
