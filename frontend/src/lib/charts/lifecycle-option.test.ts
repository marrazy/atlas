import { describe, expect, it } from 'vitest'
import type { Lifecycle, LifecycleSet } from '@/lib/api/types'
import { lifecycles } from '@/test/fixtures'
import { CHART_COLOURS as C } from './colours'
import { describeLifecycles, lifecycleOption, lifecycleTooltip, percent } from './lifecycle-option'

const volve = lifecycles.fields[0]
const heimdal: Lifecycle = {
  field_id: 43590,
  name: 'Heimdal',
  main_product: 'gas',
  first_year: 1986,
  peak_year: 1987,
  plateau_years: 2,
  series: [
    [0, 0.9],
    [1, 1],
    [3, 0.4],
  ],
}
const set: LifecycleSet = { fields: [heimdal, volve], median: lifecycles.median }

type Series = {
  name: string
  data: unknown[]
  symbol?: string
  silent: boolean
  lineStyle: { width: number; color: string; type?: number[] }
  endLabel?: { formatter: string; color: string; backgroundColor: string }
}
const seriesOf = (option: ReturnType<typeof lifecycleOption>) => option.series as Series[]

describe('lifecycleOption', () => {
  const option = lifecycleOption(set, volve)
  const [other, median, highlight] = seriesOf(option)

  it('draws the other fields first, then the median, then the highlighted field on top', () => {
    expect(seriesOf(option).map((s) => s.name)).toEqual(['Heimdal', 'Median of all fields', 'Volve'])
  })

  it('draws other fields as thin grey lines with no dots and no hover', () => {
    expect(other.lineStyle).toMatchObject({ width: 1, color: C.other })
    expect(other.symbol).toBe('none')
    expect(other.silent).toBe(true)
  })

  it('breaks a line where a field skipped years', () => {
    expect(other.data).toEqual([
      [0, 0.9],
      [1, 1],
      [2, null],
      [3, 0.4],
    ])
  })

  it('tells the lines apart by width and dashes as well as colour, and names the two that matter', () => {
    expect(median.lineStyle).toEqual({ width: 2, color: C.foreground, type: [6, 4] })
    expect(median.data).toEqual(lifecycles.median)
    expect(median.endLabel?.formatter).toBe('Median')
    expect(highlight.lineStyle).toEqual({ width: 3, color: C.oil })
    expect(highlight.endLabel?.formatter).toBe('Volve')
  })

  it('draws a highlighted gas field in the gas colour', () => {
    const [, , gas] = seriesOf(lifecycleOption(set, heimdal))
    expect([gas.name, gas.lineStyle.color]).toEqual(['Heimdal', C.gas])
  })

  it('draws only the grey lines and the median when no field is highlighted', () => {
    expect(seriesOf(lifecycleOption(set, null)).map((s) => s.name)).toEqual(['Heimdal', 'Volve', 'Median of all fields'])
  })

  it('shows shares from 0 to 100% and years from 0 to the oldest field', () => {
    expect([option.yAxis.min, option.yAxis.max, option.yAxis.axisLabel.formatter(0.75)]).toEqual([0, 1, '75%'])
    expect([option.xAxis.min, option.xAxis.max]).toEqual([0, 8])
  })

  it('labels only whole years, so a zoomed axis does not show "0.4"', () => {
    const label = option.xAxis.axisLabel.formatter
    expect([label(0), label(10), label(0.4), label(19.9)]).toEqual(['0', '10', '', ''])
  })

  it('zooms along the years only, and keeps lines whole at the edges', () => {
    expect(option.toolbox.feature.dataZoom).toEqual({ xAxisIndex: 0, yAxisIndex: false, filterMode: 'none' })
  })
})

describe('lifecycleTooltip', () => {
  const tooltip = lifecycleTooltip(set, volve)
  const text = (age: number) => tooltip([{ axisValue: age }]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  it('gives the highlighted field with its calendar year, and the median', () => {
    expect(text(1)).toBe('1 year after first production Volve, 2009 100% of best year Median of all fields 78% of best year')
  })

  it('leaves the field out past the end of its line, so it never shows a future year', () => {
    expect(text(20)).toBe('20 years after first production')
  })

  it('says "no production" in a skipped year inside the line', () => {
    const gap = lifecycleTooltip(set, heimdal)([{ axisValue: 2 }])
    expect(gap).toContain('Heimdal, 1988')
    expect(gap).toContain('no production')
  })
})

describe('describeLifecycles', () => {
  it('describes the chart and the highlighted field from the data', () => {
    expect(describeLifecycles(set, volve)).toBe(
      'Line chart of 2 fields, each as a share of its own best year, against years since first production. The median of all fields is a dashed line. Volve is highlighted. It started in 2008, had its best year in 2009, 1 year later, and produced within 10% of that for 1 year.',
    )
  })

  it('leaves out the highlight sentence when no field is highlighted', () => {
    expect(describeLifecycles(set, null)).not.toContain('highlighted')
  })
})

describe('percent', () => {
  it('rounds a share to a whole percent', () => {
    expect([percent(0.7764), percent(1), percent(0)]).toEqual(['78%', '100%', '0%'])
  })
})
