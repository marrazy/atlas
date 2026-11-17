import { describe, expect, it } from 'vitest'
import { shelf } from '@/test/fixtures'
import { CHART_COLOURS } from './colours'
import { describeShelf, formatVolume, shelfOption, shelfTooltip } from './shelf-option'

function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

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

  it('puts those words on a dark box so they pass 4.5 to 1', () => {
    for (const series of [oil, gas]) {
      const label = series.markPoint.data[0].label as { color: string; backgroundColor: string }
      expect(contrast(label.color, label.backgroundColor)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('marks the peak year from the API with a pin and its total', () => {
    const [, pin, text] = gas.markPoint.data
    expect(pin.coord).toEqual(['2004', 264.406])
    expect(pin.label.formatter).toBe('PK')
    expect(text.label.formatter).toBe('Peak 2004, 264')
  })

  it('names the unit on the axis', () => {
    expect(option.yAxis.name).toBe('Million Sm³ o.e.')
  })

  it('gives the chart a spoken description', () => {
    expect(describeShelf(shelf)).toBe(
      'Stacked area chart of yearly saleable production on the shelf, oil below and gas above, 1971 to 2004. Peak in 2004 at 264 million Sm³ o.e.',
    )
    expect(option.aria.label.description).toBe(describeShelf(shelf))
  })
})

describe('year line', () => {
  type MarkLine = { data: { xAxis: string }[]; label: { formatter: string; color: string; backgroundColor: string } }
  const lineOf = (o: ReturnType<typeof shelfOption>) => (o.series[0] as unknown as { markLine: MarkLine }).markLine

  it('marks the year chosen on the map with a line and the year in a box', () => {
    const line = lineOf(shelfOption(shelf, 1972))
    expect(line.data).toEqual([{ xAxis: '1972' }])
    expect(line.label.formatter).toBe('1972')
  })

  it('draws no line before a year is chosen', () => {
    expect(lineOf(shelfOption(shelf)).data).toEqual([])
  })

  it('writes the year in dark text on a light box, above 4.5 to 1', () => {
    const { label } = lineOf(shelfOption(shelf, 1972))
    expect(contrast(label.color, label.backgroundColor)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('shelfTooltip', () => {
  const text = (year: string) =>
    new DOMParser().parseFromString(shelfTooltip(shelf.years)([{ name: year }]), 'text/html').body.textContent

  it('shows oil, gas and the total for the year, with the unit', () => {
    expect(text('2004')).toBe('2004Oil, NGL and condensate 185Gas 79Total 264 million Sm³ o.e.')
  })

  it('keeps a decimal for the first years, when production was small', () => {
    expect(text('1971')).toBe('1971Oil, NGL and condensate 0.4Gas 0.0Total 0.4 million Sm³ o.e.')
  })

  it('shows nothing for a year that is not in the data', () => {
    expect(shelfTooltip(shelf.years)([{ name: '1960' }])).toBe('')
  })
})
