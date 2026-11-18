import type { ShelfSummary, ShelfYear } from '@/lib/api/types'
import { formatCompact, formatNumber } from '@/lib/format'
import { AXIS_LABEL, CHART_COLOURS as C, CHART_FONTS as F, SPLIT_LINE, TOOLTIP_STYLE } from './colours'

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

/** The tooltip from the design: the year in medium weight, then oil, gas and the total. */
export function shelfTooltip(years: ShelfYear[]) {
  const byYear = new Map(years.map((y) => [String(y.year), y]))
  return (params: { name: string }[]) => {
    const y = params[0] && byYear.get(params[0].name)
    if (!y) return ''
    const row = (text: string) => `<div style="color:${C.text2}">${text}</div>`
    return [
      `<div style="font-weight:500;margin-bottom:2px;color:${C.text}">${y.year}</div>`,
      row(`Oil ${formatVolume(y.liquids_net_msm3)} · Gas ${formatVolume(y.gas_net_bsm3)}`),
      row(`Total ${formatVolume(y.oe_net_msm3)} million Sm³ o.e.`),
    ].join('')
  }
}

/**
 * Where to write "Oil" and "Gas" inside their areas: the middle of each band, in the year that band is widest.
 * The last few years are left out, so a label is never cut off at the right edge of the chart.
 */
function areaLabelPoints(years: ShelfYear[]) {
  const inner = years.length > 12 ? years.slice(0, -8) : years
  const widest = (key: 'liquids_net_msm3' | 'gas_net_bsm3') => inner.reduce((best, y) => (y[key] > best[key] ? y : best))
  const oil = widest('liquids_net_msm3')
  const gas = widest('gas_net_bsm3')
  return {
    oil: [String(oil.year), oil.liquids_net_msm3 / 2],
    gas: [String(gas.year), gas.liquids_net_msm3 + gas.gas_net_bsm3 / 2],
  }
}

/** The dashed line that follows the map's year slider. */
function yearLine(year: number | null) {
  return {
    silent: true,
    symbol: 'none',
    animationDurationUpdate: 150,
    lineStyle: { color: C.text, type: [4, 3], width: 1 },
    label: { show: false },
    data: year === null ? [] : [{ xAxis: String(year) }],
  }
}

/** `compact` is for phone screens, where the peak label goes left of its line so it does not run into the year line. */
export function shelfOption(shelf: ShelfSummary, year: number | null = null, compact = false) {
  const years = shelf.years
  const labels = areaLabelPoints(years)
  const areaName = (text: string, coord: (string | number)[]) => ({
    coord,
    symbol: 'circle',
    symbolSize: 0,
    label: { show: true, formatter: text, color: C.card, fontFamily: F.sans, fontSize: 11, fontWeight: 500 },
  })
  // a short vertical line above the peak, with a plain text label
  const peak = [String(shelf.peak_year), shelf.peak_oe_net_msm3]

  return {
    animationDuration: 400,
    aria: { enabled: true, label: { description: describeShelf(shelf) } },
    textStyle: { fontFamily: F.sans, color: C.text },
    grid: { left: 36, right: 8, top: 24, bottom: 24 },
    xAxis: {
      type: 'category' as const,
      boundaryGap: false,
      data: years.map((y) => String(y.year)),
      axisLine: { show: false },
      axisTick: { show: false },
      // the first year and each decade, like the design: 1971, 1980, 1990 and so on
      axisLabel: {
        ...AXIS_LABEL,
        hideOverlap: true,
        interval: (index: number, value: string) => index === 0 || Number(value) % 10 === 0,
      },
    },
    yAxis: {
      type: 'value' as const,
      boundaryGap: [0, '12%'],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...AXIS_LABEL, formatter: formatCompact },
      splitLine: SPLIT_LINE,
    },
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis' as const,
      axisPointer: { type: 'line' as const, lineStyle: { color: C.muted, width: 1 } },
      formatter: shelfTooltip(years),
    },
    series: [
      {
        name: 'Oil, NGL and condensate',
        type: 'line' as const,
        stack: 'total',
        data: years.map((y) => y.liquids_net_msm3),
        symbol: 'circle',
        symbolSize: 8,
        showSymbol: false,
        lineStyle: { width: 0 },
        itemStyle: { color: C.oil, borderColor: C.card, borderWidth: 2 },
        areaStyle: { color: C.oil, opacity: 0.88 },
        emphasis: { disabled: true },
        markPoint: { silent: true, data: [areaName('Oil', labels.oil)] },
        markLine: yearLine(year),
      },
      {
        name: 'Gas',
        type: 'line' as const,
        stack: 'total',
        data: years.map((y) => y.gas_net_bsm3),
        symbol: 'circle',
        symbolSize: 8,
        showSymbol: false,
        // the 2px white line between the oil and gas areas
        lineStyle: { width: 2, color: C.card },
        itemStyle: { color: C.gas, borderColor: C.card, borderWidth: 2 },
        areaStyle: { color: C.gas, opacity: 0.88 },
        emphasis: { disabled: true },
        markPoint: {
          silent: true,
          data: [
            areaName('Gas', labels.gas),
            {
              coord: peak,
              symbol: 'rect',
              symbolSize: [1, 14],
              symbolOffset: [0, -10],
              itemStyle: { color: C.text2 },
              label: {
                show: true,
                position: compact ? ('left' as const) : ('top' as const),
                distance: 4,
                formatter: `Peak ${shelf.peak_year}, ${formatVolume(shelf.peak_oe_net_msm3)}`,
                color: C.text2,
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
