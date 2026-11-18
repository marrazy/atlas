import type { Lifecycle, LifecycleSet } from '@/lib/api/types'
import { lifecycleLine } from '@/lib/lifecycles'
import { CHART_COLOURS as C, CHART_FONTS as F } from './colours'

export const percent = (share: number) => `${Math.round(share * 100)}%`

const years = (n: number) => `${n} ${n === 1 ? 'year' : 'years'}`

/** The colour of a highlighted field: its main product colour, the same as on every other screen. */
export function highlightColour(field: Lifecycle): string {
  return field.main_product === 'oil' ? C.oil : C.gas
}

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
    const row = (label: string, value: string) =>
      `<div style="color:${C.mutedForeground}">${label} <span style="color:${C.foreground};font-family:${F.mono}">${value}</span></div>`
    const lines = [`<div style="font-weight:600;margin-bottom:4px">${years(age)} after first production</div>`]
    // past the end of the field's line there is nothing to say, and the calendar year could be in the future
    if (highlighted && age <= lastAge) {
      const share = own.get(age)
      const value = share === undefined ? 'no production' : `${percent(share)} of best year`
      lines.push(row(`${highlighted.name}, ${highlighted.first_year + age}`, value))
    }
    const middle = median.get(age)
    if (middle !== undefined) lines.push(row('Median of all fields', `${percent(middle)} of best year`))
    return lines.join('')
  }
}

/**
 * `compact` is for phone screens. The names at the line ends need a wide empty margin on the right, so there
 * they are left out and the legend names the lines instead.
 */
export function lifecycleOption(set: LifecycleSet, highlighted: Lifecycle | null, compact = false) {
  const axisText = { color: C.mutedForeground, fontFamily: F.mono, fontSize: 11 }
  const oldest = Math.max(0, ...set.fields.flatMap((f) => f.series.map(([age]) => age)))
  // a name at the end of a line, on a small dark box so it can be read over the other lines
  const endLabel = (text: string) => ({
    show: !compact,
    formatter: text,
    color: C.foreground,
    backgroundColor: C.background,
    padding: [2, 6],
    borderRadius: 4,
    fontFamily: F.sans,
    fontSize: 12,
    fontWeight: 600 as const,
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
      lineStyle: { width: 1, color: C.other, opacity: 0.4 },
      itemStyle: { color: C.other },
      z: 1,
    }))

  const median = {
    ...quiet,
    id: 'median',
    name: 'Median of all fields',
    type: 'line' as const,
    data: lifecycleLine(set.median),
    symbol: 'none',
    lineStyle: { width: 2, color: C.foreground, type: [6, 4] },
    itemStyle: { color: C.foreground },
    endLabel: endLabel('Median'),
    z: 3,
  }

  const highlight = highlighted && {
    ...quiet,
    id: 'highlight',
    name: highlighted.name,
    type: 'line' as const,
    data: lifecycleLine(highlighted.series),
    lineStyle: { width: 3, color: highlightColour(highlighted) },
    itemStyle: { color: highlightColour(highlighted) },
    endLabel: endLabel(highlighted.name),
    z: 4,
  }

  return {
    animationDuration: 400,
    aria: { enabled: true, label: { description: describeLifecycles(set, highlighted) } },
    textStyle: { fontFamily: F.sans, color: C.foreground },
    grid: { left: compact ? 40 : 52, right: compact ? 12 : 110, top: 20, bottom: 44 },
    xAxis: {
      type: 'value' as const,
      min: 0,
      max: oldest,
      minInterval: 1,
      name: 'Years since first production',
      nameLocation: 'middle' as const,
      nameGap: 28,
      nameTextStyle: { color: C.mutedForeground, fontFamily: F.sans, fontSize: 11 },
      axisLine: { lineStyle: { color: C.border } },
      axisTick: { show: false },
      // after zooming, the axis can start or end part way through a year, so only whole years get a label
      axisLabel: { ...axisText, formatter: (age: number) => (Number.isInteger(age) ? String(age) : '') },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      min: 0,
      max: 1,
      interval: 0.25,
      axisLabel: { ...axisText, formatter: percent },
      splitLine: { lineStyle: { color: C.border, type: [3, 3] } },
    },
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'line' as const, lineStyle: { color: C.mutedForeground } },
      backgroundColor: C.background,
      borderColor: C.border,
      textStyle: { color: C.foreground, fontFamily: F.sans, fontSize: 12 },
      formatter: lifecycleTooltip(set, highlighted),
    },
    // The card's "Zoom into an area" button turns on this tool. ECharts only creates the tool when the
    // toolbox is shown, so it is shown outside the chart, where its own canvas icons cannot be seen.
    toolbox: {
      show: true,
      left: -1000,
      top: -1000,
      feature: { dataZoom: { xAxisIndex: 0, yAxisIndex: false, filterMode: 'none' } },
    },
    series: [...others, median, ...(highlight ? [highlight] : [])],
  }
}
