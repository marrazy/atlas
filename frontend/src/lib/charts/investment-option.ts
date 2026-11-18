import type { InvestmentYear } from '@/lib/api/types'
import { formatNumber } from '@/lib/format'
import { AXIS_LABEL, CHART_COLOURS as C, CHART_FONTS as F, SPLIT_LINE, TOOLTIP_STYLE } from './colours'

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
  return `<div style="font-weight:500;color:${C.text}">${bar.name}</div><div style="color:${C.text2}">${text}</div>`
}

/** Years written short, like ’05, as in design v2. */
export const shortYear = (year: string | number) => `’${String(year).slice(-2)}`

/** Bars in the neutral grey, the year with the most investment in the text colour, values on the two highest. */
export function investmentOption(fieldName: string, s: InvestmentSeries) {
  const ranked = s.values
    .map((value, i) => ({ value: value ?? -1, i }))
    .sort((a, b) => b.value - a.value)
    .filter((bar) => bar.value > 0)
  const highest = ranked[0]?.i
  const labelled = new Set(ranked.slice(0, LABELLED_BARS).map((bar) => bar.i))

  return {
    animationDuration: 400,
    aria: { enabled: true, label: { description: describeInvestment(fieldName, s) } },
    textStyle: { fontFamily: F.sans, color: C.text },
    grid: { left: 48, right: 8, top: 24, bottom: 24 },
    xAxis: {
      type: 'category' as const,
      data: s.years.map(String),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...AXIS_LABEL, hideOverlap: true, formatter: shortYear },
    },
    yAxis: {
      type: 'value' as const,
      // room above the tallest bar for its value label
      boundaryGap: [0, '15%'],
      axisLine: { show: false },
      axisTick: { show: false },
      // full numbers like 1,200, as in the design
      axisLabel: { ...AXIS_LABEL, formatter: (value: number) => formatNumber(value) },
      splitLine: SPLIT_LINE,
    },
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const, shadowStyle: { color: 'rgba(23, 23, 23, 0.04)' } },
      formatter: investmentTooltip,
    },
    series: [
      {
        name: 'Investment',
        type: 'bar' as const,
        barMaxWidth: 56,
        data: s.values.map((value, i) => ({
          value,
          itemStyle: { color: i === highest ? C.text : C.neutralBar, borderRadius: [4, 4, 0, 0] },
          label: {
            show: labelled.has(i),
            position: 'top' as const,
            distance: 4,
            color: C.text,
            fontFamily: F.mono,
            fontSize: 11,
            formatter: ({ value: v }: { value: number }) => formatNumber(v),
          },
        })),
        emphasis: { disabled: true },
      },
    ],
  }
}
