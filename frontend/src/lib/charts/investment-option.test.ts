import { describe, expect, it } from 'vitest'
import { volveInvestments } from '@/test/fixtures'
import { CHART_COLOURS } from './colours'
import { describeInvestment, investmentOption, investmentSeries, investmentTooltip } from './investment-option'

// Fram's real pattern: years with investment, then 2011 and 2013 missing.
const FRAM_LIKE = [
  { year: 2010, investment_mnok: 900.5 },
  { year: 2012, investment_mnok: 410 },
  { year: 2014, investment_mnok: 1200 },
]

describe('investmentSeries', () => {
  it('lists every year with its investment and adds up the total (Volve 2005 to 2007)', () => {
    expect(investmentSeries(volveInvestments)).toEqual({
      years: [2005, 2006, 2007],
      values: [184, 583, 1170],
      total: 1937,
    })
  })

  it('keeps a year with no investment reported as an empty slot, not a zero', () => {
    const s = investmentSeries(FRAM_LIKE)!
    expect(s.years).toEqual([2010, 2011, 2012, 2013, 2014])
    expect(s.values).toEqual([900.5, null, 410, null, 1200])
  })

  it('gives nothing for a field with no investment rows', () => {
    expect(investmentSeries([])).toBeNull()
  })
})

describe('investmentOption', () => {
  const option = investmentOption('Volve', investmentSeries(volveInvestments)!)
  const bars = option.series[0].data

  it('draws one bar per year, in the muted colour of the design', () => {
    expect(option.xAxis.data).toEqual(['2005', '2006', '2007'])
    expect(bars.map((b) => b.value)).toEqual([184, 583, 1170])
    expect(option.series[0].itemStyle.color).toBe(CHART_COLOURS.mutedForeground)
  })

  it('writes the value on the two biggest bars only, like the design', () => {
    expect(bars.map((b) => b.label.show)).toEqual([false, true, true])
    expect(bars[2].label.formatter()).toBe('1,170')
  })

  it('names the unit on the axis', () => {
    expect(option.yAxis.name).toBe('Million NOK')
  })

  it('gives the chart a spoken description with the total', () => {
    expect(option.aria.label.description).toBe(
      'Bar chart of Volve investment by year in million Norwegian kroner, 2005 to 2007, 1,937 million in total.',
    )
    expect(describeInvestment('Fram', investmentSeries(FRAM_LIKE)!)).toBe(
      'Bar chart of Fram investment by year in million Norwegian kroner, 2010 to 2014, 2,511 million in total.',
    )
  })
})

describe('investmentTooltip', () => {
  const text = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent

  it('shows the year and the amount with its unit', () => {
    expect(text(investmentTooltip([{ name: '2007', value: 1170 }]))).toBe('20071,170 million NOK')
  })

  it('says when a year has no investment reported', () => {
    expect(text(investmentTooltip([{ name: '2011', value: null }]))).toBe('2011no investment reported')
  })

  it('shows nothing when nothing is under the pointer', () => {
    expect(investmentTooltip([])).toBe('')
  })
})
