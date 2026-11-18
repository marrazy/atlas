import type { DeclineResult, ProductionMonth, YearMonth } from '@/lib/api/types'
import { ECONOMIC_LIMIT, type FitWindow } from '@/lib/decline'
import { formatCompact, formatMonth, formatNumber, monthOf, monthStart } from '@/lib/format'
import { AXIS_LABEL, CHART_COLOURS as C, CHART_FONTS as F, SPLIT_LINE, TOOLTIP_STYLE } from './colours'

/** The chart starts in January two years before the fit window, for context. For Volve that is Jan 2013. */
const YEARS_BEFORE = 2

/** Log axis steps, the way engineers read a decline: 30, 100, 300, 1k, 3k, 10k. */
export const LOG_STEPS = [1, 3, 10, 30, 100, 300, 1_000, 3_000, 10_000, 30_000, 100_000, 300_000]

type Point = [time: number, value: number]

type DeclineChartInput = {
  fieldName: string
  months: ProductionMonth[]
  window: FitWindow
  result: DeclineResult
  /** The last month of production, marked as the shutdown when the field has shut down. */
  shutDown: YearMonth | null
}

const point = (month: YearMonth, value: number): Point => [monthStart(month), value]

export function chartStart(window: FitWindow, months: ProductionMonth[]): YearMonth {
  const january = `${Number(window.start.slice(0, 4)) - YEARS_BEFORE}-01`
  return january > months[0].month ? january : months[0].month
}

/** The log axis range: from the step at or below the lowest value to the step at or above the highest. */
export function logRange(values: number[]): { min: number; max: number; steps: number[] } {
  const positive = values.filter((v) => v > 0)
  const low = Math.min(...positive)
  const high = Math.max(...positive)
  const min = [...LOG_STEPS].reverse().find((step) => step <= low) ?? LOG_STEPS[0]
  const max = LOG_STEPS.find((step) => step >= high) ?? LOG_STEPS.at(-1)!
  return { min, max, steps: LOG_STEPS.filter((step) => step >= min && step <= max) }
}

export function describeDecline({ fieldName, window, result }: DeclineChartInput): string {
  const model = result.model.charAt(0).toUpperCase() + result.model.slice(1)
  const last = result.forecast.at(-1)
  const forecast = last ? `, with a forecast to ${formatMonth(last.month, 'long')} and a forecast range` : ''
  return `${model} Arps decline curve fitted to ${fieldName} oil rate from ${formatMonth(window.start, 'long')} to ${formatMonth(window.end, 'long')}${forecast}.`
}

export function declineOption(input: DeclineChartInput) {
  const { months, window, result, shutDown } = input
  const from = chartStart(window, months)
  // a log axis cannot show months with no oil, so those are left out of the dots
  const shown = months.filter((m) => m.month >= from && m.oil_rate > 0)
  const inWindow = (m: YearMonth) => m >= window.start && m <= window.end
  const y = logRange([
    ...shown.map((m) => m.oil_rate),
    ...result.fitted.map((p) => p.rate),
    ...result.forecast.flatMap((p) => [p.low, p.high]),
    ECONOMIC_LIMIT,
  ])

  const actualByMonth = new Map(shown.map((m) => [m.month, m.oil_rate]))
  const fittedByMonth = new Map(result.fitted.map((p) => [p.month, p.rate]))
  const forecastByMonth = new Map(result.forecast.map((p) => [p.month, p]))

  const lastFitted = result.fitted.at(-1)
  const forecastLine = [...(lastFitted ? [point(lastFitted.month, lastFitted.rate)] : []), ...result.forecast.map((p) => point(p.month, p.rate))]

  const tooltip = (params: { axisValue: number }[]) => {
    if (params.length === 0) return ''
    const month = monthOf(params[0].axisValue)
    const rows: string[] = []
    const row = (text: string) => rows.push(`<div style="color:${C.text2}">${text}</div>`)

    const actual = actualByMonth.get(month)
    if (actual !== undefined) row(`${inWindow(month) ? 'Oil rate' : 'Oil rate, outside the fit window,'} ${formatNumber(actual)} Sm³/day`)
    const fitted = fittedByMonth.get(month)
    if (fitted !== undefined) row(`Fitted ${formatNumber(fitted)} Sm³/day`)
    const forecast = forecastByMonth.get(month)
    if (forecast) row(`Forecast ${formatNumber(forecast.rate)} Sm³/day, range ${formatNumber(forecast.low)} to ${formatNumber(forecast.high)}`)
    if (rows.length === 0) return ''
    return `<div style="font-weight:500;margin-bottom:2px;color:${C.text}">${formatMonth(month)}</div>${rows.join('')}`
  }

  const smallLabel = { color: C.text2, fontFamily: F.sans, fontSize: 11 }

  return {
    useUTC: true,
    animationDuration: 400,
    aria: { enabled: true, label: { description: describeDecline(input) } },
    textStyle: { fontFamily: F.sans, color: C.text },
    grid: { left: 40, right: 8, top: 12, bottom: 24 },
    xAxis: {
      type: 'time' as const,
      min: monthStart(from),
      max: monthStart(result.forecast.at(-1)?.month ?? window.end),
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { ...AXIS_LABEL, hideOverlap: true, formatter: { year: '{yyyy}', month: '', day: '' } },
    },
    yAxis: {
      type: 'log' as const,
      logBase: 10,
      min: y.min,
      max: y.max,
      axisLine: { show: false },
      axisTick: { show: false, customValues: y.steps },
      axisLabel: { ...AXIS_LABEL, customValues: y.steps, formatter: formatCompact },
      splitLine: SPLIT_LINE,
    },
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis' as const,
      axisPointer: { type: 'line' as const, lineStyle: { color: C.muted, width: 1 } },
      formatter: tooltip,
    },
    series: [
      {
        name: 'Monthly oil rate',
        type: 'scatter' as const,
        data: shown.filter((m) => inWindow(m.month)).map((m) => point(m.month, m.oil_rate)),
        symbolSize: 7,
        itemStyle: { color: C.oil },
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(23, 23, 23, 0.05)' },
          label: { ...smallLabel, position: 'insideTop' as const, distance: 8 },
          data: [[{ name: 'Fit window', xAxis: monthStart(window.start) }, { xAxis: monthStart(window.end) }]],
        },
      },
      {
        name: 'Outside the fit window',
        type: 'scatter' as const,
        data: shown.filter((m) => !inWindow(m.month)).map((m) => point(m.month, m.oil_rate)),
        symbolSize: 6,
        itemStyle: { color: 'transparent', borderColor: C.oil, borderWidth: 1.2, opacity: 0.6 },
      },
      {
        name: 'Forecast range low',
        type: 'line' as const,
        data: result.forecast.map((p) => point(p.month, p.low)),
        stack: 'range',
        symbol: 'none',
        lineStyle: { opacity: 0 },
        silent: true,
      },
      {
        name: 'Forecast range',
        type: 'line' as const,
        data: result.forecast.map((p) => point(p.month, p.high - p.low)),
        stack: 'range',
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: { color: C.gas, opacity: 0.16 },
        silent: true,
      },
      {
        name: 'Fitted curve',
        type: 'line' as const,
        data: result.fitted.map((p) => point(p.month, p.rate)),
        symbol: 'none',
        lineStyle: { width: 1.5, color: C.gas },
        itemStyle: { color: C.gas },
      },
      {
        name: 'Forecast',
        type: 'line' as const,
        data: forecastLine,
        symbol: 'none',
        lineStyle: { width: 1.5, color: C.gas, type: [4, 3] },
        itemStyle: { color: C.gas },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              yAxis: ECONOMIC_LIMIT,
              lineStyle: { color: C.text2, type: [4, 3], width: 1 },
              label: { ...smallLabel, position: 'insideEndTop' as const, formatter: `Economic limit, ${ECONOMIC_LIMIT} Sm³/day` },
            },
            ...(shutDown
              ? [{ xAxis: monthStart(shutDown), lineStyle: { color: C.muted, type: [3, 3], width: 1 }, label: { show: false } }]
              : []),
          ],
        },
        // the shut down label is written flat, to the right of the top of its line, as in the design
        markPoint: shutDown
          ? {
              silent: true,
              data: [
                {
                  coord: [monthStart(shutDown), y.max],
                  symbolSize: 0,
                  label: {
                    ...smallLabel,
                    show: true,
                    position: 'right' as const,
                    offset: [2, 10],
                    formatter: `Shut down, ${formatMonth(shutDown)}`,
                  },
                },
              ],
            }
          : undefined,
      },
    ],
  }
}
