import { describe, expect, it } from 'vitest'
import { shelf } from '@/test/fixtures'
import { CHART_COLOURS, CHART_FONTS } from './colours'
import { describeShelf, formatVolume, shelfOption, shelfTooltip } from './shelf-option'

const option = shelfOption(shelf)
const [oil, gas] = option.series

describe('formatVolume', () => {
  it('rounds to whole numbers, but keeps one decimal for small early years', () => {
    expect(formatVolume(264.406)).toBe('264')
    expect(formatVolume(0.357)).toBe('0.4')
    expect(formatVolume(9.94)).toBe('9.9')
  })

  it('writes a value that rounds up to 10 as "10", not "10.0", like the larger years', () => {
    expect(formatVolume(9.96)).toBe('10')
    expect(formatVolume(10.2)).toBe('10')
  })
})

describe('shelfOption', () => {
  it('stacks oil below and gas above, one point per full year', () => {
    expect(option.xAxis.data).toEqual(['1971', '1972', '2004'])
    expect([oil.name, oil.stack, oil.data]).toEqual(['Oil, NGL and condensate', 'total', [0.357, 1.927, 185.095]])
    expect([gas.name, gas.stack, gas.data]).toEqual(['Gas', 'total', [0, 0, 79.311]])
  })

  it('uses the oil and gas colours from the theme', () => {
    expect(oil.areaStyle.color).toBe(CHART_COLOURS.oil)
    expect(gas.areaStyle.color).toBe(CHART_COLOURS.gas)
  })

  it('writes "Oil" and "Gas" inside the areas, so colour is not the only clue', () => {
    expect(oil.markPoint.data[0].label.formatter).toBe('Oil')
    expect(gas.markPoint.data[0].label.formatter).toBe('Gas')
  })

  it('writes those words in white, as design v2 asks, inside areas filled at 0.88', () => {
    for (const series of [oil, gas]) {
      expect((series.markPoint.data[0].label as { color: string }).color).toBe(CHART_COLOURS.card)
      expect(series.areaStyle.opacity).toBe(0.88)
    }
  })

  it('puts a 2px white line between the oil and gas areas', () => {
    expect(gas.lineStyle).toEqual({ width: 2, color: CHART_COLOURS.card })
  })

  it('marks the peak year from the API with a short line and a plain label, not a pin', () => {
    const peak = gas.markPoint.data[1] as unknown as { coord: unknown; symbol: string; symbolSize: number[]; label: { formatter: string } }
    expect(peak.coord).toEqual(['2004', 264.406])
    expect(peak.symbol).toBe('rect')
    expect(peak.symbolSize).toEqual([1, 14])
    expect(peak.label.formatter).toBe('Peak 2004, 264')
    expect(JSON.stringify(option)).not.toContain('pin')
  })

  it('draws grid lines but no axis lines or ticks, with mono axis labels', () => {
    expect(option.yAxis.splitLine.lineStyle).toMatchObject({ color: CHART_COLOURS.chartGrid, type: 'solid', width: 1 })
    for (const axis of [option.xAxis, option.yAxis]) {
      expect(axis.axisLine.show).toBe(false)
      expect(axis.axisTick.show).toBe(false)
      expect(axis.axisLabel).toMatchObject({ fontSize: 11, color: CHART_COLOURS.muted, fontFamily: CHART_FONTS.mono })
    }
  })

  it('labels the first year and each decade on the x axis, like the design', () => {
    const show = option.xAxis.axisLabel.interval
    expect([show(0, '1971'), show(1, '1972'), show(9, '1980'), show(10, '1981')]).toEqual([true, false, true, false])
  })

  it('has no toolbox', () => {
    expect(option).not.toHaveProperty('toolbox')
  })

  it('gives the chart a spoken description', () => {
    expect(describeShelf(shelf)).toBe(
      'Stacked area chart of yearly saleable production on the shelf, oil below and gas above, 1971 to 2004. Peak in 2004 at 264 million Sm³ o.e.',
    )
    expect(option.aria.label.description).toBe(describeShelf(shelf))
  })
})

describe('year line', () => {
  type MarkLine = { data: { xAxis: string }[]; lineStyle: { color: string; type: number[] } }
  const lineOf = (o: ReturnType<typeof shelfOption>) => (o.series[0] as unknown as { markLine: MarkLine }).markLine

  it('marks the year chosen on the map with a dashed line in the text colour', () => {
    const line = lineOf(shelfOption(shelf, 1972))
    expect(line.data).toEqual([{ xAxis: '1972' }])
    expect(line.lineStyle).toMatchObject({ color: CHART_COLOURS.text, type: [4, 3] })
  })

  it('draws no line before a year is chosen', () => {
    expect(lineOf(shelfOption(shelf)).data).toEqual([])
  })
})

describe('shelfTooltip', () => {
  const text = (year: string) =>
    new DOMParser().parseFromString(shelfTooltip(shelf.years)([{ name: year }]), 'text/html').body.textContent

  it('shows oil, gas and the total for the year, with the unit', () => {
    expect(text('2004')).toBe('2004Oil 185 · Gas 79Total 264 million Sm³ o.e.')
  })

  it('keeps a decimal for the first years, when production was small', () => {
    expect(text('1971')).toBe('1971Oil 0.4 · Gas 0.0Total 0.4 million Sm³ o.e.')
  })

  it('shows nothing for a year that is not in the data', () => {
    expect(shelfTooltip(shelf.years)([{ name: '1960' }])).toBe('')
  })
})

describe('shelfOption on a phone', () => {
  const peakLabel = (o: ReturnType<typeof shelfOption>) =>
    (o.series[1].markPoint.data[1] as unknown as { label: { position: string } }).label

  it('puts the peak label left of its line, so it does not run into the year line at the right edge', () => {
    expect(peakLabel(shelfOption(shelf)).position).toBe('top')
    expect(peakLabel(shelfOption(shelf, null, true)).position).toBe('left')
  })
})
