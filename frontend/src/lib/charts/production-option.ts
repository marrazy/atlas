import type { ProductionMonth, YearMonth } from '@/lib/api/types'
import { formatCompact, formatMonth, formatNumber, monthOf, monthStart } from '@/lib/format'
import { AXIS_LABEL, CHART_COLOURS as C, CHART_FONTS as F, SPLIT_LINE, TOOLTIP_STYLE } from './colours'

export type Point = [time: number, value: number | null]

export type ProductionSeries = {
  oil: Point[]
  gor: Point[]
  first: YearMonth
  last: YearMonth
  peak: { month: YearMonth; rate: number } | null
}

/**
 * One point per calendar month from the first to the last month. A month missing from the API
 * becomes an empty point, so the line breaks there instead of being drawn across the gap.
 */
export function productionSeries(months: ProductionMonth[]): ProductionSeries | null {
  if (months.length === 0) return null

  const byMonth = new Map(months.map((m) => [m.month, m]))
  const first = months[0].month
  const last = months[months.length - 1].month
  const oil: Point[] = []
  const gor: Point[] = []
  let peak: ProductionSeries['peak'] = null

  for (let time = monthStart(first); time <= monthStart(last); ) {
    const month = monthOf(time)
    const row = byMonth.get(month)
    oil.push([time, row ? row.oil_rate : null])
    gor.push([time, row ? row.gor : null])
    if (row && row.oil_rate > 0 && (!peak || row.oil_rate > peak.rate)) peak = { month, rate: row.oil_rate }

    const date = new Date(time)
    time = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
  }

  return { oil, gor, first, last, peak }
}

/**
 * When the highest gas oil ratio is this many times the typical one, a normal axis squashes most of
 * the line against zero (Troll starts near 170,000 but is usually near 3,600), so a log scale is used.
 */
export const LOG_SCALE_SPREAD = 10

export function gorNeedsLogScale(gor: Point[]): boolean {
  const values = gor.map(([, value]) => value).filter((value): value is number => value !== null && value > 0)
  if (values.length === 0) return false
  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted[Math.floor((sorted.length - 1) / 2)]
  return sorted[sorted.length - 1] / median > LOG_SCALE_SPREAD
}

export function describeProduction(fieldName: string, s: ProductionSeries): string {
  const span = `${formatMonth(s.first, 'long')} to ${formatMonth(s.last, 'long')}`
  const peak = s.peak ? `, with a peak of ${formatNumber(s.peak.rate)} in ${formatMonth(s.peak.month)}` : ''
  const scale = gorNeedsLogScale(s.gor) ? ', on a log scale' : ''
  return `Two linked charts for ${fieldName}, ${span}. Top, oil rate in Sm³ per day${peak}. Bottom, gas oil ratio in Sm³ of gas per Sm³ of oil${scale}.`
}

type TooltipParam = { axisValue: number; seriesIndex: number; data: Point }

/** The tooltip for one month: the month, the oil rate and the gas oil ratio, or that the ratio was not reported. */
export function tooltipText(params: TooltipParam[]): string {
  if (params.length === 0) return ''
  const value = (index: number) => params.find((p) => p.seriesIndex === index)?.data[1] ?? null
  const oil = value(0)
  const gor = value(1)
  const row = (text: string) => `<div style="color:${C.text2}">${text}</div>`

  return [
    `<div style="font-weight:500;margin-bottom:2px;color:${C.text}">${formatMonth(monthOf(params[0].axisValue))}</div>`,
    row(oil === null ? 'Oil rate not reported' : `Oil ${formatNumber(oil)} Sm³/day`),
    row(gor === null ? 'Gas oil ratio not reported' : `Gas oil ratio ${formatNumber(gor)}`),
  ].join('')
}

/** A light band with a label over the oil rate chart, for a stretch of months worth pointing out. */
export type ProductionNote = { start: YearMonth; end: YearMonth; label: string }

const noAxisLine = { axisLine: { show: false }, axisTick: { show: false } }

export function productionOption(fieldName: string, s: ProductionSeries, note: ProductionNote | null = null) {
  const gorLog = gorNeedsLogScale(s.gor)
  const min = monthStart(s.first)
  const max = monthStart(s.last)
  const timeAxis = { type: 'time' as const, min, max, ...noAxisLine, splitLine: { show: false } }
  const plainLabel = { color: C.text2, fontFamily: F.sans, fontSize: 12 }

  const noteArea = note
    ? {
        silent: true,
        itemStyle: { color: 'rgba(23, 23, 23, 0.04)' },
        label: { ...plainLabel, position: 'insideTopLeft' as const, distance: 8 },
        data: [[{ name: note.label, xAxis: monthStart(note.start) }, { xAxis: monthStart(note.end) }]],
      }
    : undefined

  // the peak as a small dot and a plain text label, no pin
  const peakMark = s.peak
    ? {
        silent: true,
        data: [
          {
            coord: [monthStart(s.peak.month), s.peak.rate],
            symbol: 'circle',
            symbolSize: 7,
            itemStyle: { color: C.oil },
            label: { ...plainLabel, show: true, position: 'right' as const, distance: 6, formatter: `Peak, ${formatMonth(s.peak.month)}` },
          },
        ],
      }
    : undefined

  return {
    useUTC: true,
    animationDuration: 400,
    aria: { enabled: true, label: { description: describeProduction(fieldName, s) } },
    textStyle: { fontFamily: F.sans, color: C.text },
    grid: [
      { left: 44, right: 8, top: 12, height: 200 },
      { left: 44, right: 8, top: 252, height: 110 },
    ],
    xAxis: [
      { ...timeAxis, gridIndex: 0, axisLabel: { show: false } },
      {
        ...timeAxis,
        gridIndex: 1,
        axisLabel: { ...AXIS_LABEL, hideOverlap: true, formatter: { year: '{yyyy}', month: '', day: '' } },
        axisPointer: { label: { show: false } },
      },
    ],
    yAxis: [
      {
        type: 'value' as const,
        gridIndex: 0,
        ...noAxisLine,
        // room above the highest month for the peak label
        boundaryGap: [0, '10%'],
        axisLabel: { ...AXIS_LABEL, formatter: formatCompact },
        splitLine: SPLIT_LINE,
      },
      {
        type: gorLog ? ('log' as const) : ('value' as const),
        gridIndex: 1,
        ...noAxisLine,
        name: `Gas oil ratio, Sm³ gas per Sm³ oil${gorLog ? ', log scale' : ''}`,
        nameTextStyle: { color: C.muted, fontFamily: F.sans, fontSize: 11, align: 'left' as const },
        nameGap: 10,
        splitNumber: 2,
        axisLabel: { ...AXIS_LABEL, formatter: formatCompact },
        splitLine: SPLIT_LINE,
      },
    ],
    axisPointer: {
      link: [{ xAxisIndex: 'all' }],
      lineStyle: { color: C.muted, width: 1 },
    },
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis' as const,
      axisPointer: { type: 'line' as const },
      formatter: tooltipText,
    },
    // a quiet zoom bar under both charts: raised track, handles in the secondary text colour
    dataZoom: [
      {
        type: 'slider' as const,
        xAxisIndex: [0, 1],
        bottom: 8,
        height: 28,
        borderColor: 'transparent',
        backgroundColor: C.raised,
        fillerColor: 'rgba(23, 23, 23, 0.04)',
        dataBackground: { lineStyle: { color: C.otherLine, width: 1 }, areaStyle: { opacity: 0 } },
        selectedDataBackground: { lineStyle: { color: C.otherLine, width: 1 }, areaStyle: { opacity: 0 } },
        handleStyle: { color: C.text2, borderColor: C.text2 },
        handleSize: '60%',
        moveHandleSize: 0,
        showDetail: false,
        brushSelect: false,
      },
    ],
    series: [
      {
        name: 'Oil rate',
        type: 'line' as const,
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: s.oil,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 7,
        connectNulls: false,
        lineStyle: { width: 1.5, color: C.oil },
        itemStyle: { color: C.oil, borderColor: C.card, borderWidth: 2 },
        areaStyle: { color: C.oil, opacity: 0.12 },
        emphasis: { disabled: true },
        markPoint: peakMark,
        markArea: noteArea,
      },
      {
        name: 'Gas oil ratio',
        type: 'line' as const,
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: s.gor,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 7,
        connectNulls: false,
        lineStyle: { width: 1.5, color: C.gas },
        itemStyle: { color: C.gas, borderColor: C.card, borderWidth: 2 },
        emphasis: { disabled: true },
      },
    ],
  }
}
