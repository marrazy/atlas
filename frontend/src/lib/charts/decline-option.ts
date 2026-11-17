import type { DeclineResult, ProductionMonth, YearMonth } from '@/lib/api/types'
import { ECONOMIC_LIMIT, type FitWindow } from '@/lib/decline'
import { formatCompact, formatMonth, formatNumber, monthOf, monthStart } from '@/lib/format'
import { CHART_COLOURS as C, CHART_FONTS as F } from './colours'

/** How many months of real data to show before the fit window, for context. */
const MONTHS_BEFORE = 24

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

function chartStart(window: FitWindow, months: ProductionMonth[]): YearMonth {
  const date = new Date(monthStart(window.start))
  const back = monthOf(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - MONTHS_BEFORE, 1))
  return back > months[0].month ? back : months[0].month
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
  const shown = months.filter((m) => m.month >= from)
  const inWindow = (m: YearMonth) => m >= window.start && m <= window.end

  const actualByMonth = new Map(shown.map((m) => [m.month, m.oil_rate]))
  const fittedByMonth = new Map(result.fitted.map((p) => [p.month, p.rate]))
  const forecastByMonth = new Map(result.forecast.map((p) => [p.month, p]))

  const lastFitted = result.fitted.at(-1)
  const forecastLine = [...(lastFitted ? [point(lastFitted.month, lastFitted.rate)] : []), ...result.forecast.map((p) => point(p.month, p.rate))]

  const tooltip = (params: { axisValue: number }[]) => {
    if (params.length === 0) return ''
    const month = monthOf(params[0].axisValue)
    const rows: string[] = []
    const row = (label: string, text: string) =>
      rows.push(`<div style="color:${C.mutedForeground}">${label} <span style="color:${C.foreground};font-family:${F.mono}">${text}</span></div>`)

    const actual = actualByMonth.get(month)
    if (actual !== undefined) row(inWindow(month) ? 'Oil rate' : 'Oil rate, outside the fit window,', `${formatNumber(actual)} Sm³/day`)
    const fitted = fittedByMonth.get(month)
    if (fitted !== undefined) row('Fitted', `${formatNumber(fitted)} Sm³/day`)
    const forecast = forecastByMonth.get(month)
    if (forecast) row('Forecast', `${formatNumber(forecast.rate)} Sm³/day (${formatNumber(forecast.low)} to ${formatNumber(forecast.high)})`)
    if (rows.length === 0) return ''
    return `<div style="font-weight:600;margin-bottom:4px">${formatMonth(month)}</div>${rows.join('')}`
  }

  const mutedLabel = { color: C.mutedForeground, fontFamily: F.sans, fontSize: 11 }

  return {
    useUTC: true,
    animationDuration: 400,
    aria: { enabled: true, label: { description: describeDecline(input) } },
    textStyle: { fontFamily: F.sans, color: C.foreground },
    grid: { left: 56, right: 16, top: 30, bottom: 32 },
    xAxis: {
      type: 'time' as const,
      min: monthStart(from),
      max: monthStart(result.forecast.at(-1)?.month ?? window.end),
      axisLine: { lineStyle: { color: C.border } },
      axisTick: { show: false },
      axisLabel: { color: C.mutedForeground, fontFamily: F.mono, fontSize: 11, hideOverlap: true, formatter: { year: '{yyyy}', month: '{MMM}', day: '' } },
    },
    yAxis: {
      type: 'value' as const,
      name: 'Oil rate, Sm³/day',
      nameTextStyle: { ...mutedLabel, align: 'left' as const },
      nameGap: 12,
      min: 0,
      axisLabel: { color: C.mutedForeground, fontFamily: F.mono, fontSize: 11, formatter: formatCompact },
      splitLine: { lineStyle: { color: C.border, type: [3, 3] } },
    },
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'line' as const, lineStyle: { color: C.mutedForeground } },
      backgroundColor: C.background,
      borderColor: C.border,
      textStyle: { color: C.foreground, fontFamily: F.sans, fontSize: 12 },
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
          itemStyle: { color: 'rgba(235, 229, 222, 0.05)' },
          label: { ...mutedLabel, position: 'insideTopLeft' as const },
          data: [[{ name: 'Fit window', xAxis: monthStart(window.start) }, { xAxis: monthStart(window.end) }]],
        },
      },
      {
        name: 'Outside the fit window',
        type: 'scatter' as const,
        data: shown.filter((m) => !inWindow(m.month)).map((m) => point(m.month, m.oil_rate)),
        symbolSize: 6,
        itemStyle: { color: C.other },
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
        areaStyle: { color: C.gas, opacity: 0.2 },
        silent: true,
      },
      {
        name: 'Fitted curve',
        type: 'line' as const,
        data: result.fitted.map((p) => point(p.month, p.rate)),
        symbol: 'none',
        lineStyle: { width: 2, color: C.gas },
        itemStyle: { color: C.gas },
      },
      {
        name: 'Forecast',
        type: 'line' as const,
        data: forecastLine,
        symbol: 'none',
        lineStyle: { width: 2, color: C.gas, type: [5, 4] },
        itemStyle: { color: C.gas },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              yAxis: ECONOMIC_LIMIT,
              lineStyle: { color: C.mutedForeground, type: [6, 4], width: 1 },
              label: { ...mutedLabel, position: 'insideEndTop' as const, formatter: `Economic limit, ${ECONOMIC_LIMIT} Sm³/day (example)` },
            },
            ...(shutDown
              ? [
                  {
                    xAxis: monthStart(shutDown),
                    lineStyle: { color: C.mutedForeground, type: [3, 3], width: 1 },
                    label: { ...mutedLabel, position: 'end' as const, formatter: `Shut down, ${formatMonth(shutDown)}` },
                  },
                ]
              : []),
          ],
        },
      },
    ],
  }
}
