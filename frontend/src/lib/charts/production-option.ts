import type { ProductionMonth, YearMonth } from '@/lib/api/types'
import type { FitWindow } from '@/lib/decline'
import { formatCompact, formatMonth, formatNumber, monthOf, monthStart } from '@/lib/format'
import { CHART_COLOURS as C, CHART_FONTS as F } from './colours'

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

const swatch = (colour: string) =>
  `<span style="display:inline-block;width:12px;height:2px;margin-right:8px;vertical-align:middle;background:${colour}"></span>`

/** The tooltip text for one month. Oil rate and gas oil ratio always appear, with a reason when a value is missing. */
export function tooltipText(params: TooltipParam[]): string {
  if (params.length === 0) return ''
  const value = (index: number) => params.find((p) => p.seriesIndex === index)?.data[1] ?? null
  const oil = value(0)
  const gor = value(1)

  const oilText = oil === null ? 'no data' : `${formatNumber(oil)} Sm³/day`
  const gorText =
    gor !== null ? `${formatNumber(gor)} Sm³/Sm³` : oil === null ? 'no data' : 'not shown, too little oil or no gas'

  const line = (colour: string, label: string, text: string) =>
    `<div style="color:${C.mutedForeground}">${swatch(colour)}${label} <span style="color:${C.foreground};font-family:${F.mono}">${text}</span></div>`

  return [
    `<div style="font-weight:600;margin-bottom:4px">${formatMonth(monthOf(params[0].axisValue))}</div>`,
    line(C.oil, 'Oil rate', oilText),
    line(C.gas, 'Gas oil ratio', gorText),
  ].join('')
}

const axisText = { color: C.mutedForeground, fontFamily: F.mono, fontSize: 11 }
const axisName = { color: C.mutedForeground, fontFamily: F.sans, fontSize: 11, align: 'left' as const }
const gridLine = { lineStyle: { color: C.border, type: [3, 3] } }

export function productionOption(fieldName: string, s: ProductionSeries, fitWindow: FitWindow | null = null) {
  const gorLog = gorNeedsLogScale(s.gor)
  const fitArea = fitWindow
    ? {
        silent: true,
        itemStyle: { color: 'rgba(235, 229, 222, 0.05)' },
        label: { color: C.mutedForeground, fontFamily: F.sans, fontSize: 11, position: 'insideTopLeft' as const },
        data: [[{ name: 'Decline fit window', xAxis: monthStart(fitWindow.start) }, { xAxis: monthStart(fitWindow.end) }]],
      }
    : undefined
  const min = monthStart(s.first)
  const max = monthStart(s.last)
  const timeAxis = { type: 'time' as const, min, max, axisLine: { lineStyle: { color: C.border } }, axisTick: { show: false } }

  const peakMark = s.peak
    ? {
        silent: true,
        data: [
          {
            coord: [monthStart(s.peak.month), s.peak.rate],
            symbol: 'pin',
            symbolSize: 30,
            itemStyle: { color: C.foreground },
            label: { show: true, formatter: 'PK', color: C.background, fontSize: 9, fontWeight: 700, fontFamily: F.sans },
          },
          {
            coord: [monthStart(s.peak.month), s.peak.rate],
            symbol: 'circle',
            symbolSize: 0,
            label: {
              show: true,
              position: 'right',
              offset: [12, -20],
              formatter: `Peak ${formatNumber(s.peak.rate)} Sm³/day`,
              color: C.foreground,
              fontSize: 11,
              fontFamily: F.sans,
            },
          },
        ],
      }
    : undefined

  return {
    useUTC: true,
    animationDuration: 400,
    aria: { enabled: true, label: { description: describeProduction(fieldName, s) } },
    textStyle: { fontFamily: F.sans, color: C.foreground },
    grid: [
      { left: 56, right: 16, top: 28, height: 186 },
      { left: 56, right: 16, top: 266, height: 118 },
    ],
    xAxis: [
      { ...timeAxis, gridIndex: 0, axisLabel: { show: false } },
      {
        ...timeAxis,
        gridIndex: 1,
        axisLabel: { ...axisText, hideOverlap: true, formatter: { year: '{yyyy}', month: '{MMM}', day: '' } },
        axisPointer: { label: { show: true } },
      },
    ],
    yAxis: [
      {
        type: 'value' as const,
        gridIndex: 0,
        name: 'Oil rate, Sm³/day',
        nameTextStyle: axisName,
        nameGap: 12,
        // room above the highest month for the peak marker
        boundaryGap: [0, '20%'],
        axisLabel: { ...axisText, formatter: formatCompact },
        splitLine: gridLine,
      },
      {
        type: gorLog ? ('log' as const) : ('value' as const),
        gridIndex: 1,
        name: `Gas oil ratio, Sm³ gas per Sm³ oil${gorLog ? ' (log scale)' : ''}`,
        nameTextStyle: axisName,
        nameGap: 12,
        splitNumber: 2,
        axisLabel: { ...axisText, formatter: formatCompact },
        splitLine: gridLine,
      },
    ],
    axisPointer: {
      link: [{ xAxisIndex: 'all' }],
      lineStyle: { color: C.mutedForeground },
      label: {
        backgroundColor: C.foreground,
        color: C.background,
        fontFamily: F.mono,
        fontWeight: 600,
        formatter: ({ value }: { value: number }) => formatMonth(monthOf(value)),
      },
    },
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'line' as const },
      backgroundColor: C.background,
      borderColor: C.border,
      textStyle: { color: C.foreground, fontFamily: F.sans, fontSize: 12 },
      formatter: tooltipText,
    },
    // The card's "Zoom into an area" button turns on this tool. ECharts only creates the tool when the
    // toolbox is shown, so it is shown outside the chart, where its own canvas icons cannot be seen.
    toolbox: {
      show: true,
      left: -1000,
      top: -1000,
      feature: { dataZoom: { xAxisIndex: [0, 1], yAxisIndex: false } },
    },
    dataZoom: [
      {
        type: 'slider' as const,
        xAxisIndex: [0, 1],
        bottom: 12,
        height: 26,
        borderColor: C.border,
        backgroundColor: 'transparent',
        fillerColor: 'rgba(235, 229, 222, 0.08)',
        dataBackground: { lineStyle: { color: C.other }, areaStyle: { opacity: 0 } },
        selectedDataBackground: { lineStyle: { color: C.mutedForeground }, areaStyle: { opacity: 0 } },
        handleStyle: { color: C.mutedForeground, borderColor: C.mutedForeground },
        moveHandleStyle: { color: C.mutedForeground },
        textStyle: { ...axisText },
        labelFormatter: (value: number) => formatMonth(monthOf(value)),
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
        connectNulls: false,
        lineStyle: { width: 2, color: C.oil },
        itemStyle: { color: C.oil },
        areaStyle: { color: C.oil, opacity: 0.15 },
        markPoint: peakMark,
        markArea: fitArea,
      },
      {
        name: 'Gas oil ratio',
        type: 'line' as const,
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: s.gor,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { width: 2, color: C.gas },
        itemStyle: { color: C.gas },
      },
    ],
  }
}
