import { describe, expect, it } from 'vitest'
import type { ProductionMonth } from '@/lib/api/types'
import { monthStart } from '@/lib/format'
import { volveProduction } from '@/test/fixtures'
import { CHART_COLOURS } from './colours'
import {
  describeProduction,
  gorNeedsLogScale,
  productionOption,
  productionSeries,
  tooltipText,
  type Point,
} from './production-option'

const row = (month: string, oil_rate: number, gor: number | null = 150): ProductionMonth => ({
  month,
  oil_rate,
  gas_rate: gor === null ? 0 : oil_rate * gor,
  gor,
  oe_net_msm3: 0.1,
})

// Volve's real first four months, plus its real last month.
const VOLVE: ProductionMonth[] = [...volveProduction, row('2016-09', 287.3, null)]

describe('productionSeries', () => {
  it('turns months into one point per calendar month, with time in UTC', () => {
    const s = productionSeries(volveProduction)!
    expect(s.oil).toEqual([
      [monthStart('2008-02'), 1694.7],
      [monthStart('2008-03'), 2689.1],
      [monthStart('2008-04'), 2497.5],
      [monthStart('2008-05'), 4047.7],
    ])
    expect(s.first).toBe('2008-02')
    expect(s.last).toBe('2008-05')
  })

  it('keeps an empty gas oil ratio as a gap, not a zero (Volve reported no gas in its first months)', () => {
    const s = productionSeries(volveProduction)!
    expect(s.gor.map(([, v]) => v)).toEqual([null, null, null, 152.2])
  })

  it('adds empty points for months missing from the data, so the line breaks (Yme stopped in 2001)', () => {
    const s = productionSeries([row('2001-07', 900), row('2001-10', 1200)])!
    expect(s.oil.map(([, v]) => v)).toEqual([900, null, null, 1200])
    expect(s.gor.map(([, v]) => v)).toEqual([150, null, null, 150])
  })

  it('steps across the end of a year correctly', () => {
    const s = productionSeries([row('2008-11', 1), row('2009-02', 2)])!
    expect(s.oil.map(([t]) => new Date(t).toISOString().slice(0, 7))).toEqual([
      '2008-11',
      '2008-12',
      '2009-01',
      '2009-02',
    ])
  })

  it('finds the peak month', () => {
    expect(productionSeries(VOLVE)!.peak).toEqual({ month: '2008-05', rate: 4047.7 })
  })

  it('has no peak when there was no oil, and no series at all without months', () => {
    expect(productionSeries([row('2020-01', 0, null)])!.peak).toBeNull()
    expect(productionSeries([])).toBeNull()
  })
})

describe('gorNeedsLogScale', () => {
  const gor = (values: (number | null)[]): Point[] => values.map((v, i) => [i, v])

  it('keeps a normal scale when the ratio stays in one range (Volve, 136 to 203)', () => {
    expect(gorNeedsLogScale(gor([null, null, 152, 136, 160, 203, 145]))).toBe(false)
  })

  it('uses a log scale when one spike would squash the rest (Troll, near 3,600 but up to 171,516)', () => {
    expect(gorNeedsLogScale(gor([171516, 3200, 3600, 3900, 4100, 2800]))).toBe(true)
  })

  it('keeps a normal scale when there is no ratio at all', () => {
    expect(gorNeedsLogScale(gor([null, null]))).toBe(false)
  })
})

type Axis = { name?: string; nameTextStyle?: object; type: string }
const gorAxis = (o: ReturnType<typeof productionOption>) => o.yAxis[1] as Axis

describe('productionOption', () => {
  const option = productionOption('Volve', productionSeries(VOLVE)!)

  it('draws two charts, one above the other, on one canvas', () => {
    expect(option.grid).toHaveLength(2)
    expect(option.series.map((s) => [s.name, s.xAxisIndex, s.yAxisIndex])).toEqual([
      ['Oil rate', 0, 0],
      ['Gas oil ratio', 1, 1],
    ])
  })

  it('shares one crosshair and one tooltip between them', () => {
    expect(option.axisPointer.link).toEqual([{ xAxisIndex: 'all' }])
    expect(option.tooltip.trigger).toBe('axis')
  })

  it('has one quiet zoom bar that moves both charts, and no toolbox', () => {
    expect(option.dataZoom).toEqual([
      expect.objectContaining({ type: 'slider', xAxisIndex: [0, 1], backgroundColor: CHART_COLOURS.raised }),
    ])
    expect(option.dataZoom[0].handleStyle.color).toBe(CHART_COLOURS.text2)
    expect(option.dataZoom[0].dataBackground.lineStyle.color).toBe(CHART_COLOURS.otherLine)
    expect(option).not.toHaveProperty('toolbox')
  })

  it('keeps both time axes on the same months, in UTC', () => {
    expect(option.useUTC).toBe(true)
    const [top, bottom] = option.xAxis
    expect([top.min, top.max]).toEqual([monthStart('2008-02'), monthStart('2016-09')])
    expect([bottom.min, bottom.max]).toEqual([top.min, top.max])
  })

  it('puts the caption over the gas oil ratio chart, and the oil rate unit in the legend', () => {
    expect(gorAxis(option).name).toBe('Gas oil ratio, Sm³ gas per Sm³ oil')
    expect(gorAxis(option).nameTextStyle).toMatchObject({ fontSize: 11, color: CHART_COLOURS.muted })
    expect(option.yAxis[1].type).toBe('value')
  })

  it('makes the oil rate chart about 200px tall and the gas oil ratio chart about 110px', () => {
    expect(option.grid.map((g) => g.height)).toEqual([200, 110])
  })

  it('switches the gas oil ratio to a labelled log scale for spiky data', () => {
    const spiky = productionOption('Troll', productionSeries([row('1990-01', 60, 171516), ...['02', '03', '04'].map((m) => row(`1990-${m}`, 9000, 3600))])!)
    expect(spiky.yAxis[1].type).toBe('log')
    expect(gorAxis(spiky).name).toBe('Gas oil ratio, Sm³ gas per Sm³ oil, log scale')
  })

  it('breaks lines at gaps instead of drawing across them', () => {
    expect(option.series.every((s) => s.connectNulls === false)).toBe(true)
  })

  it('uses the oil and gas colours, with the area under the oil rate at 0.12', () => {
    expect(option.series[0].lineStyle.color).toBe(CHART_COLOURS.oil)
    expect(option.series[0].areaStyle?.opacity).toBe(0.12)
    expect(option.series[1].lineStyle.color).toBe(CHART_COLOURS.gas)
  })

  it('marks the peak month with a small dot and a plain label, not a pin', () => {
    const [peak] = option.series[0].markPoint!.data
    expect(peak.coord).toEqual([monthStart('2008-05'), 4047.7])
    expect(peak.symbol).toBe('circle')
    expect(peak.label.formatter).toBe('Peak, May 2008')
    expect(JSON.stringify(option)).not.toContain('pin')
  })

  it('gives the chart a spoken description', () => {
    expect(option.aria).toEqual({
      enabled: true,
      label: {
        description:
          'Two linked charts for Volve, February 2008 to September 2016. Top, oil rate in Sm³ per day, with a peak of 4,048 in May 2008. Bottom, gas oil ratio in Sm³ of gas per Sm³ of oil.',
      },
    })
  })
})

describe('describeProduction', () => {
  it('leaves out the peak when the field had no oil', () => {
    expect(describeProduction('Berling', productionSeries([row('2025-01', 0, null)])!)).toBe(
      'Two linked charts for Berling, January 2025 to January 2025. Top, oil rate in Sm³ per day. Bottom, gas oil ratio in Sm³ of gas per Sm³ of oil.',
    )
  })
})

describe('tooltipText', () => {
  const text = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent
  const at = (month: string, oil: number | null, gor: number | null) => [
    { axisValue: monthStart(month), seriesIndex: 0, data: [monthStart(month), oil] as Point },
    { axisValue: monthStart(month), seriesIndex: 1, data: [monthStart(month), gor] as Point },
  ]

  it('shows the month, the oil rate and the gas oil ratio', () => {
    expect(text(tooltipText(at('2008-12', 8923.8, 145.3)))).toBe('Dec 2008Oil 8,924 Sm³/dayGas oil ratio 145')
  })

  it('says "Gas oil ratio not reported" when the ratio is empty', () => {
    expect(text(tooltipText(at('2008-03', 2689.1, null)))).toBe('Mar 2008Oil 2,689 Sm³/dayGas oil ratio not reported')
  })

  it('says so for a month missing from the data', () => {
    expect(text(tooltipText(at('2010-06', null, null)))).toBe('Jun 2010Oil rate not reportedGas oil ratio not reported')
  })

  it('shows nothing when there is nothing under the pointer', () => {
    expect(tooltipText([])).toBe('')
  })
})

describe('productionOption note', () => {
  it('draws a light, labelled band for a stretch of months worth pointing out (Volve: output rises again)', () => {
    const noted = productionOption('Volve', productionSeries(VOLVE)!, { start: '2008-03', end: '2008-05', label: 'Output rises again' })
    expect(noted.series[0].markArea!.data).toEqual([
      [{ name: 'Output rises again', xAxis: monthStart('2008-03') }, { xAxis: monthStart('2008-05') }],
    ])
  })

  it('has no band without a note', () => {
    expect(productionOption('Volve', productionSeries(VOLVE)!).series[0].markArea).toBeUndefined()
  })
})
