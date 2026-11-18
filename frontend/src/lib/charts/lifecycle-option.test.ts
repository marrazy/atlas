import { describe, expect, it } from 'vitest'
import type { Lifecycle, LifecycleSet } from '@/lib/api/types'
import { lifecycles } from '@/test/fixtures'
import { CHART_COLOURS as C } from './colours'
import { describeLifecycles, lifecycleAxisMax, lifecycleOption, lifecycleTooltip, percent } from './lifecycle-option'

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
  endLabel?: { show: boolean; formatter: string; color: string; backgroundColor: string }
}
const seriesOf = (option: ReturnType<typeof lifecycleOption>) => option.series as Series[]

describe('lifecycleOption', () => {
  const option = lifecycleOption(set, volve)
  const [other, median, highlight] = seriesOf(option)

  it('draws the other fields first, then the median, then the highlighted field on top', () => {
    expect(seriesOf(option).map((s) => s.name)).toEqual(['Heimdal', 'Median of all fields', 'Volve'])
  })

  it('draws other fields as thin grey lines with no dots and no hover', () => {
    expect(other.lineStyle).toMatchObject({ width: 1, color: C.otherLine })
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
    expect(median.lineStyle).toEqual({ width: 2, color: C.text, type: [4, 3] })
    expect(median.data).toEqual(lifecycles.median)
    expect(median.endLabel?.formatter).toBe('Median')
    expect(highlight.lineStyle).toEqual({ width: 2.5, color: C.oil })
    expect(highlight.endLabel).toMatchObject({ formatter: 'Volve', fontSize: 13, textBorderColor: C.card })
  })

  it('draws the selected field as an oil line, even a gas field, as design v2 asks', () => {
    const [, , gas] = seriesOf(lifecycleOption(set, heimdal))
    expect([gas.name, gas.lineStyle.color]).toEqual(['Heimdal', C.oil])
  })

  it('draws only the grey lines and the median when no field is highlighted', () => {
    expect(seriesOf(lifecycleOption(set, null)).map((s) => s.name)).toEqual(['Heimdal', 'Volve', 'Median of all fields'])
  })

  it('shows shares from 0 to 100%, and years from 0 to a round 5 past the oldest field', () => {
    expect([option.yAxis.min, option.yAxis.max, option.yAxis.axisLabel.formatter(0.75)]).toEqual([0, 1, '75%'])
    expect([option.xAxis.min, option.xAxis.max]).toEqual([0, 10])
    expect(lifecycleAxisMax({ fields: [{ ...volve, series: [[54, 0.2]] }], median: [] })).toBe(55)
  })

  it('names the x axis at its right end, and leaves the last labels out to give the name room', () => {
    expect(option.xAxis).toMatchObject({ name: 'years since first production', nameLocation: 'end' })
    const wide = lifecycleOption({ fields: [{ ...volve, series: [[54, 0.2]] }], median: [] }, null)
    const label = wide.xAxis.axisLabel.formatter
    expect([0, 10, 20, 30, 40, 50].map(label)).toEqual(['0', '10', '20', '30', '40', ''])
  })

  it('draws grey lines at 0.55 opacity, with no toolbox', () => {
    expect(other.lineStyle).toMatchObject({ width: 1, color: C.otherLine, opacity: 0.55 })
    expect(option).not.toHaveProperty('toolbox')
  })

  it('gives each line a fixed id by its place, so a new highlight merged into the chart lands on the right line', () => {
    const ids = (o: ReturnType<typeof lifecycleOption>) => (o.series as { id: string }[]).map((s) => s.id)
    expect(ids(option)).toEqual(['other-0', 'median', 'highlight'])
    expect(ids(lifecycleOption(set, heimdal))).toEqual(ids(option))
  })

})

describe('lifecycleTooltip', () => {
  const tooltip = lifecycleTooltip(set, volve)
  const text = (age: number) => tooltip([{ axisValue: age }]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  it('gives the highlighted field with its calendar year, and the median', () => {
    expect(text(1)).toBe('1 year after first production Volve, 2009: 100% of best year Median of all fields: 78% of best year')
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

describe('lifecycleOption on a phone', () => {
  it('drops the line end names and their wide margin, so the lines use the whole width', () => {
    const wide = lifecycleOption(set, volve)
    const phone = lifecycleOption(set, volve, true)
    expect([wide.grid.right, phone.grid.right]).toEqual([24, 8])
    expect(seriesOf(phone).flatMap((s) => (s.endLabel ? [s.endLabel.show] : []))).toEqual([false, false])
    expect(seriesOf(wide).flatMap((s) => (s.endLabel ? [s.endLabel.show] : []))).toEqual([true, true])
  })
})
