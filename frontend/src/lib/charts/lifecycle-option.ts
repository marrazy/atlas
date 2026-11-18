import type { Lifecycle, LifecycleSet } from '@/lib/api/types'
import { lifecycleLine } from '@/lib/lifecycles'
import { AXIS_LABEL, CHART_COLOURS as C, CHART_FONTS as F, SPLIT_LINE, TOOLTIP_STYLE } from './colours'

export const percent = (share: number) => `${Math.round(share * 100)}%`

const years = (n: number) => `${n} ${n === 1 ? 'year' : 'years'}`

export function describeLifecycles(set: LifecycleSet, highlighted: Lifecycle | null): string {
  const intro = `Line chart of ${set.fields.length} fields, each as a share of its own best year, against years since first production. The median of all fields is a dashed line.`
  if (!highlighted) return intro
  const age = highlighted.peak_year - highlighted.first_year
  return `${intro} ${highlighted.name} is highlighted. It started in ${highlighted.first_year}, had its best year in ${highlighted.peak_year}, ${years(age)} later, and produced within 10% of that for ${years(highlighted.plateau_years)}.`
}

export function lifecycleTooltip(set: LifecycleSet, highlighted: Lifecycle | null) {
  const median = new Map(set.median)
  const own = new Map(highlighted?.series ?? [])
  const lastAge = highlighted?.series.at(-1)?.[0] ?? -1
  return (params: { axisValue: number }[]) => {
    const age = Math.round(params[0]?.axisValue ?? NaN)
    if (Number.isNaN(age)) return ''
    const row = (text: string) => `<div style="color:${C.text2}">${text}</div>`
    const lines = [`<div style="font-weight:500;margin-bottom:2px;color:${C.text}">${years(age)} after first production</div>`]
    // past the end of the field's line there is nothing to say, and the calendar year could be in the future
    if (highlighted && age <= lastAge) {
      const share = own.get(age)
      const value = share === undefined ? 'no production' : `${percent(share)} of best year`
      lines.push(row(`${highlighted.name}, ${highlighted.first_year + age}: ${value}`))
    }
    const middle = median.get(age)
    if (middle !== undefined) lines.push(row(`Median of all fields: ${percent(middle)} of best year`))
    return lines.join('')
  }
}

/** The x axis ends on a round 5 years past the oldest field, 0 to 55 years with today's data. */
export function lifecycleAxisMax(set: LifecycleSet): number {
  const oldest = Math.max(0, ...set.fields.flatMap((f) => f.series.map(([age]) => age)))
  return Math.ceil(oldest / 5) * 5
}

/**
 * Design v2: every field as a thin grey line, the selected field as an oil line on top with its name at the end,
 * and the median as a dashed line. `compact` is for phone screens, where the end names are left out because they
 * need a wide margin, and the legend names the lines instead.
 */
export function lifecycleOption(set: LifecycleSet, highlighted: Lifecycle | null, compact = false) {
  const max = lifecycleAxisMax(set)
  // a name at the end of a line, with a white halo so it can be read over the grey lines
  const endLabel = (text: string, size: number) => ({
    show: !compact,
    formatter: text,
    color: C.text,
    textBorderColor: C.card,
    textBorderWidth: 3,
    fontFamily: F.sans,
    fontSize: size,
    fontWeight: 500 as const,
    distance: 6,
  })
  // A new highlight is merged into the chart, so each line gets a fixed id by its place. Merging by name
  // would give a field's new grey line the style of its old highlighted line.
  const quiet = { silent: true, emphasis: { disabled: true }, showSymbol: false, connectNulls: false }

  const others = set.fields
    .filter((f) => f.field_id !== highlighted?.field_id)
    .map((f, i) => ({
      ...quiet,
      id: `other-${i}`,
      name: f.name,
      type: 'line' as const,
      data: lifecycleLine(f.series),
      symbol: 'none',
      lineStyle: { width: 1, color: C.otherLine, opacity: 0.55 },
      itemStyle: { color: C.otherLine },
      z: 1,
    }))

  const median = {
    ...quiet,
    id: 'median',
    name: 'Median of all fields',
    type: 'line' as const,
    data: lifecycleLine(set.median),
    symbol: 'none',
    lineStyle: { width: 2, color: C.text, type: [4, 3] },
    itemStyle: { color: C.text },
    endLabel: endLabel('Median', 11),
    z: 3,
  }

  const highlight = highlighted && {
    ...quiet,
    id: 'highlight',
    name: highlighted.name,
    type: 'line' as const,
    data: lifecycleLine(highlighted.series),
    lineStyle: { width: 2.5, color: C.oil },
    itemStyle: { color: C.oil },
    endLabel: endLabel(highlighted.name, 13),
    z: 4,
  }

  return {
    animationDuration: 400,
    aria: { enabled: true, label: { description: describeLifecycles(set, highlighted) } },
    textStyle: { fontFamily: F.sans, color: C.text },
    grid: { left: 40, right: compact ? 8 : 24, top: 12, bottom: 28 },
    xAxis: {
      type: 'value' as const,
      min: 0,
      max,
      interval: 10,
      name: 'years since first production',
      nameLocation: 'end' as const,
      nameGap: 0,
      nameTextStyle: { ...AXIS_LABEL, align: 'right' as const, verticalAlign: 'top' as const, padding: [10, 0, 0, 0] },
      axisLine: { show: false },
      axisTick: { show: false },
      // the axis name sits at the right end of the label row, so the last labels give it room
      axisLabel: { ...AXIS_LABEL, formatter: (age: number) => (Number.isInteger(age) && age <= max - 15 ? String(age) : '') },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      min: 0,
      max: 1,
      interval: 0.25,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...AXIS_LABEL, formatter: percent },
      splitLine: SPLIT_LINE,
    },
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis' as const,
      axisPointer: { type: 'line' as const, lineStyle: { color: C.muted, width: 1 } },
      formatter: lifecycleTooltip(set, highlighted),
    },
    series: [...others, median, ...(highlight ? [highlight] : [])],
  }
}
