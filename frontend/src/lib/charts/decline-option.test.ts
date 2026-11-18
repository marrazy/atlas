import { describe, expect, it } from 'vitest'
import type { DeclineResult } from '@/lib/api/types'
import { monthStart } from '@/lib/format'
import { volveDeclineHyperbolic, volveLateProduction } from '@/test/fixtures'
import { CHART_COLOURS } from './colours'
import { LOG_STEPS, chartStart, declineOption, describeDecline, logRange } from './decline-option'

const WINDOW = { start: '2015-04', end: '2016-08' }
const input = (result: DeclineResult = volveDeclineHyperbolic, shutDown: string | null = '2016-09') => ({
  fieldName: 'Volve',
  months: volveLateProduction,
  window: WINDOW,
  result,
  shutDown,
})
const option = declineOption(input())
const series = (name: string) => option.series.find((s) => s.name === name)!
const months = (points: [number, number][]) => points.map(([t]) => new Date(t).toISOString().slice(0, 7))

describe('declineOption', () => {
  it('shows the real months in the fit window as oil coloured points', () => {
    const inside = series('Monthly oil rate')
    expect(months(inside.data as [number, number][])).toHaveLength(17)
    expect(inside.data[0]).toEqual([monthStart('2015-04'), 3007.5])
    expect(inside.itemStyle!.color).toBe(CHART_COLOURS.oil)
  })

  it('shows the months around the window as faint oil rings, including the shutdown month', () => {
    const outside = series('Outside the fit window')
    expect(months(outside.data as [number, number][])).toEqual([
      '2014-08', '2014-09', '2014-10', '2014-11', '2014-12', '2015-01', '2015-02', '2015-03', '2016-09',
    ])
    expect(outside.itemStyle).toMatchObject({ color: 'transparent', borderColor: CHART_COLOURS.oil, opacity: 0.6 })
    expect([series('Monthly oil rate').symbolSize, outside.symbolSize]).toEqual([7, 6])
  })

  it('draws the fitted curve, and a dashed forecast that starts where the fit ends', () => {
    expect(series('Fitted curve').data).toEqual([
      [monthStart('2015-04'), 3042.5],
      [monthStart('2015-05'), 2826.4],
    ])
    const forecast = series('Forecast')
    expect(forecast.data[0]).toEqual([monthStart('2015-05'), 2826.4])
    expect(forecast.data.slice(1)).toEqual([
      [monthStart('2016-09'), 876.3],
      [monthStart('2016-10'), 814.8],
    ])
    expect(forecast.lineStyle!.type).toEqual([4, 3])
    expect([series('Fitted curve').lineStyle!.color, forecast.lineStyle!.color]).toEqual([CHART_COLOURS.gas, CHART_COLOURS.gas])
  })

  it('fills the forecast range from low to high', () => {
    expect(series('Forecast range low').data).toEqual([
      [monthStart('2016-09'), 704.9],
      [monthStart('2016-10'), 651.6],
    ])
    const band = series('Forecast range')
    expect(band.stack).toBe('range')
    expect((band.data as [number, number][]).map(([, v]) => Math.round(v * 10) / 10)).toEqual([384.4, 367.3])
    expect(band.areaStyle).toEqual({ color: CHART_COLOURS.gas, opacity: 0.16 })
  })

  it('shades the fit window and labels it', () => {
    expect(series('Monthly oil rate').markArea!.data).toEqual([
      [{ name: 'Fit window', xAxis: monthStart('2015-04') }, { xAxis: monthStart('2016-08') }],
    ])
  })

  it('marks the economic limit and, for a field that shut down, the shutdown month with a flat label', () => {
    const lines = series('Forecast').markLine!.data as { yAxis?: number; xAxis?: number; lineStyle: { color: string }; label: { formatter?: string } }[]
    expect(lines[0]).toMatchObject({ yAxis: 300, lineStyle: { color: CHART_COLOURS.text2 } })
    expect(lines[0].label.formatter).toBe('Economic limit, 300 Sm³/day')
    expect(lines[1]).toMatchObject({ xAxis: monthStart('2016-09'), lineStyle: { color: CHART_COLOURS.muted } })
    const label = series('Forecast').markPoint!.data[0].label
    expect([label.formatter, label.position]).toEqual(['Shut down, Sep 2016', 'right'])
  })

  it('has no shutdown line for a field still producing', () => {
    const forecast = declineOption(input(volveDeclineHyperbolic, null)).series.find((s) => s.name === 'Forecast')!
    expect(forecast.markLine!.data).toHaveLength(1)
    expect(forecast.markPoint).toBeUndefined()
  })

  it('starts the axis in January two years before the window, or at the first month of data, and ends at the last forecast month', () => {
    expect(chartStart(WINDOW, volveLateProduction)).toBe('2014-08')
    expect(chartStart(WINDOW, [{ ...volveLateProduction[0], month: '2008-02' }])).toBe('2013-01')
    expect(option.xAxis.min).toBe(monthStart('2014-08'))
    expect(option.xAxis.max).toBe(monthStart('2016-10'))
  })

  it('uses a log y axis with labels at 30, 100, 300, 1k, 3k and 10k, the way engineers read a decline', () => {
    expect(option.yAxis).toMatchObject({ type: 'log', logBase: 10 })
    expect(logRange([40, 287, 3007.5])).toEqual({ min: 30, max: 10000, steps: [30, 100, 300, 1000, 3000, 10000] })
    expect(option.yAxis.axisLabel.customValues).toEqual(LOG_STEPS.filter((v) => v >= option.yAxis.min && v <= option.yAxis.max))
    expect(option.yAxis.axisLabel.formatter(1000)).toBe('1k')
  })

  it('leaves months with no oil out of the dots, since a log axis cannot show them', () => {
    const withZero = declineOption({ ...input(), months: [...volveLateProduction, { ...volveLateProduction[0], month: '2016-10', oil_rate: 0 }] })
    const outside = withZero.series.find((s) => s.name === 'Outside the fit window')!
    expect(months(outside.data as [number, number][])).not.toContain('2016-10')
  })

  it('gives the chart a spoken description', () => {
    expect(describeDecline(input())).toBe(
      'Hyperbolic Arps decline curve fitted to Volve oil rate from April 2015 to August 2016, with a forecast to October 2016 and a forecast range.',
    )
    expect(option.aria.label.description).toBe(describeDecline(input()))
  })
})

describe('decline tooltip', () => {
  const text = (month: string) =>
    new DOMParser().parseFromString(option.tooltip.formatter([{ axisValue: monthStart(month) }]), 'text/html').body.textContent

  it('shows the real rate and the fitted rate inside the window', () => {
    expect(text('2015-04')).toBe('Apr 2015Oil rate 3,008 Sm³/dayFitted 3,043 Sm³/day')
  })

  it('says when a month is outside the fit window', () => {
    expect(text('2015-01')).toBe('Jan 2015Oil rate, outside the fit window, 2,621 Sm³/day')
  })

  it('shows the forecast with its range', () => {
    expect(text('2016-10')).toBe('Oct 2016Forecast 815 Sm³/day, range 652 to 1,019')
  })

  it('shows the shutdown month and its forecast together', () => {
    expect(text('2016-09')).toBe(
      'Sep 2016Oil rate, outside the fit window, 287 Sm³/dayForecast 876 Sm³/day, range 705 to 1,089',
    )
  })
})
