import type { ShelfSummary, ShelfYear } from '@/lib/api/types'
import { formatCompact, formatNumber } from '@/lib/format'
import { CHART_COLOURS as C, CHART_FONTS as F } from './colours'

/** Million Sm³ o.e.: whole numbers, with one decimal for the small early years so they do not show as 0. */
export function formatVolume(value: number): string {
  const roundedToOneDecimal = Math.round(value * 10) / 10
  return formatNumber(value, Math.abs(roundedToOneDecimal) < 10 ? 1 : 0)
}

export function describeShelf(shelf: ShelfSummary): string {
  const first = shelf.years[0]?.year
  const last = shelf.years.at(-1)?.year
  return `Stacked area chart of yearly saleable production on the shelf, oil below and gas above, ${first} to ${last}. Peak in ${shelf.peak_year} at ${formatVolume(shelf.peak_oe_net_msm3)} million Sm³ o.e.`
}

export function shelfTooltip(years: ShelfYear[]) {
  const byYear = new Map(years.map((y) => [String(y.year), y]))
  return (params: { name: string }[]) => {
    const y = params[0] && byYear.get(params[0].name)
    if (!y) return ''
    const row = (label: string, value: number) =>
      `<div style="color:${C.mutedForeground}">${label} <span style="color:${C.foreground};font-family:${F.mono}">${formatVolume(value)}</span></div>`
    return [
      `<div style="font-weight:600;margin-bottom:4px">${y.year}</div>`,
      row('Oil, NGL and condensate', y.liquids_net_msm3),
      row('Gas', y.gas_net_bsm3),
      `<div style="color:${C.mutedForeground}">Total <span style="color:${C.foreground};font-family:${F.mono}">${formatVolume(y.oe_net_msm3)}</span> million Sm³ o.e.</div>`,
    ].join('')
  }
}

/** Where to write "Oil" and "Gas" inside their areas: the middle of each band, in the year that band is widest. */
function areaLabelPoints(years: ShelfYear[]) {
  const widest = (key: 'liquids_net_msm3' | 'gas_net_bsm3') => years.reduce((best, y) => (y[key] > best[key] ? y : best))
  const oil = widest('liquids_net_msm3')
  const gas = widest('gas_net_bsm3')
  return {
    oil: { coord: [String(oil.year), oil.liquids_net_msm3 / 2] },
    gas: { coord: [String(gas.year), gas.liquids_net_msm3 + gas.gas_net_bsm3 / 2] },
  }
}

/** The dashed line and year box that follow the map's year slider. */
function yearLine(year: number | null) {
  return {
    silent: true,
    symbol: 'none',
    animationDurationUpdate: 150,
    lineStyle: { color: C.foreground, type: [4, 3], width: 1 },
    label: {
      show: true,
      position: 'start' as const,
      formatter: String(year),
      color: C.background,
      backgroundColor: C.foreground,
      padding: [3, 6],
      borderRadius: 4,
      fontFamily: F.mono,
      fontSize: 11,
      fontWeight: 600,
    },
    data: year === null ? [] : [{ xAxis: String(year) }],
  }
}

/** `compact` is for phone screens, where the peak label goes left of the pin so it does not run into the year line. */
export function shelfOption(shelf: ShelfSummary, year: number | null = null, compact = false) {
  const years = shelf.years
  const labels = areaLabelPoints(years)
  const axisText = { color: C.mutedForeground, fontFamily: F.mono, fontSize: 11 }
  // Light or dark text straight on the orange and blue areas is under 4 to 1, so the words sit on a small dark box.
  const areaName = (text: string, coord: (string | number)[]) => ({
    coord,
    symbol: 'circle',
    symbolSize: 0,
    label: {
      show: true,
      formatter: text,
      color: C.foreground,
      backgroundColor: C.background,
      padding: [2, 6],
      borderRadius: 4,
      fontFamily: F.sans,
      fontSize: 12,
      fontWeight: 600,
    },
  })

  return {
    animationDuration: 400,
    aria: { enabled: true, label: { description: describeShelf(shelf) } },
    textStyle: { fontFamily: F.sans, color: C.foreground },
    grid: { left: 48, right: 16, top: 34, bottom: 28 },
    xAxis: {
      type: 'category' as const,
      boundaryGap: false,
      data: years.map((y) => String(y.year)),
      axisLine: { lineStyle: { color: C.border } },
      axisTick: { show: false },
      axisLabel: { ...axisText, hideOverlap: true },
    },
    yAxis: {
      type: 'value' as const,
      name: 'Million Sm³ o.e.',
      nameTextStyle: { color: C.mutedForeground, fontFamily: F.sans, fontSize: 11, align: 'left' as const },
      nameGap: 12,
      boundaryGap: [0, '12%'],
      axisLabel: { ...axisText, formatter: formatCompact },
      splitLine: { lineStyle: { color: C.border, type: [3, 3] } },
    },
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'line' as const, lineStyle: { color: C.mutedForeground } },
      backgroundColor: C.background,
      borderColor: C.border,
      textStyle: { color: C.foreground, fontFamily: F.sans, fontSize: 12 },
      formatter: shelfTooltip(years),
    },
    series: [
      {
        name: 'Oil, NGL and condensate',
        type: 'line' as const,
        stack: 'total',
        data: years.map((y) => y.liquids_net_msm3),
        symbol: 'none',
        lineStyle: { width: 0 },
        itemStyle: { color: C.oil },
        areaStyle: { color: C.oil, opacity: 0.9 },
        markPoint: { silent: true, data: [areaName('Oil', labels.oil.coord)] },
        markLine: yearLine(year),
      },
      {
        name: 'Gas',
        type: 'line' as const,
        stack: 'total',
        data: years.map((y) => y.gas_net_bsm3),
        symbol: 'none',
        lineStyle: { width: 2, color: C.card },
        itemStyle: { color: C.gas },
        areaStyle: { color: C.gas, opacity: 0.9 },
        markPoint: {
          silent: true,
          data: [
            areaName('Gas', labels.gas.coord),
            {
              coord: [String(shelf.peak_year), shelf.peak_oe_net_msm3],
              symbol: 'pin',
              symbolSize: 30,
              itemStyle: { color: C.foreground },
              label: { show: true, formatter: 'PK', color: C.background, fontSize: 9, fontWeight: 700, fontFamily: F.sans },
            },
            {
              coord: [String(shelf.peak_year), shelf.peak_oe_net_msm3],
              symbol: 'circle',
              symbolSize: 0,
              label: {
                show: true,
                position: compact ? ('left' as const) : ('right' as const),
                offset: compact ? [-12, -20] : [12, -20],
                formatter: `Peak ${shelf.peak_year}, ${formatVolume(shelf.peak_oe_net_msm3)}`,
                color: C.foreground,
                fontFamily: F.sans,
                fontSize: 11,
              },
            },
          ],
        },
      },
    ],
  }
}
