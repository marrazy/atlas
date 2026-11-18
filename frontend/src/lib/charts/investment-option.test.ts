import { describe, expect, it } from 'vitest'
import { volveInvestments } from '@/test/fixtures'
import { CHART_COLOURS, CHART_FONTS } from './colours'
import { describeInvestment, investmentOption, investmentSeries, investmentTooltip, shortYear } from './investment-option'

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

  it('draws one bar per year with 4px rounded tops, grey except the year with the most investment', () => {
    expect(option.xAxis.data).toEqual(['2005', '2006', '2007'])
    expect(bars.map((b) => b.value)).toEqual([184, 583, 1170])
    expect(bars.map((b) => b.itemStyle.color)).toEqual([CHART_COLOURS.neutralBar, CHART_COLOURS.neutralBar, CHART_COLOURS.text])
    expect(bars[0].itemStyle.borderRadius).toEqual([4, 4, 0, 0])
  })

  it('writes the value in mono on the highest and second highest years only, like the design', () => {
    expect(bars.map((b) => b.label.show)).toEqual([false, true, true])
    expect(bars[2].label.formatter({ value: 1170 })).toBe('1,170')
    expect(bars[2].label).toMatchObject({ fontFamily: CHART_FONTS.mono, fontSize: 11 })
  })

  it('writes years short, like ’05, and full numbers on the axis, like 1,200', () => {
    expect(option.xAxis.axisLabel.formatter('2005')).toBe('’05')
    expect(shortYear(2015)).toBe('’15')
    expect(option.yAxis.axisLabel.formatter(1200)).toBe('1,200')
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

describe('investmentOption headroom', () => {
  it('leaves room above the tallest bar for its value label', () => {
    expect(investmentOption('Volve', investmentSeries(volveInvestments)!).yAxis.boundaryGap).toEqual([0, '15%'])
  })
})
