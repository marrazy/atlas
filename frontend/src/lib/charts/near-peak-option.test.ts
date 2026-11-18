import { describe, expect, it } from 'vitest'
import type { Lifecycle } from '@/lib/api/types'
import { lifecycles } from '@/test/fixtures'
import { CHART_COLOURS as C } from './colours'
import { describeNearPeak, nearPeakOption, nearPeakSentence } from './near-peak-option'

const volve = lifecycles.fields[0]
const ekofisk: Lifecycle = { ...volve, field_id: 43506, name: 'Ekofisk', first_year: 1971, peak_year: 2002, plateau_years: 14 }
const troll: Lifecycle = { ...volve, field_id: 46437, name: 'Troll', main_product: 'gas', plateau_years: 10 }
const bars = [ekofisk, troll, volve]

type Bar = { value: number; itemStyle: { color: string } }

describe('nearPeakOption', () => {
  const option = nearPeakOption(bars, troll)
  const data = option.series[0].data as Bar[]

  it('draws one bar per field, in the order given, with the years near peak', () => {
    expect(option.yAxis.data).toEqual(['Ekofisk', 'Troll', 'Volve'])
    expect(data.map((d) => d.value)).toEqual([14, 10, 1])
  })

  it('colours the highlighted bar by its product and the others grey', () => {
    expect(data.map((d) => d.itemStyle.color)).toEqual([C.other, C.gas, C.other])
  })

  it('writes the highlighted name in bold, so the bar is found by more than its colour', () => {
    const label = option.yAxis.axisLabel.formatter
    expect([label('Troll'), label('Volve')]).toEqual(['{on|Troll}', '{off|Volve}'])
    expect(option.yAxis.axisLabel.rich.on.fontWeight).toBe(700)
  })

  it('says the number in words when hovering a bar', () => {
    expect(option.tooltip.formatter({ name: 'Volve', value: 1 })).toBe('Volve: 1 year within 10% of its best year')
  })

  it('leaves every bar grey when no field is highlighted', () => {
    const plain = nearPeakOption(bars, null).series[0].data as Bar[]
    expect(plain.every((d) => d.itemStyle.color === C.other)).toBe(true)
  })
})

describe('describeNearPeak', () => {
  it('names the field with the most years and the highlighted field', () => {
    expect(describeNearPeak(bars, volve)).toBe(
      'Bar chart of the number of years each of 3 fields produced within 10% of its best year. Ekofisk has the most, 14 years. Volve, highlighted, has 1 year.',
    )
  })
})

describe('nearPeakSentence', () => {
  it('tells the highlighted field story from its data', () => {
    expect(nearPeakSentence(ekofisk)).toBe(
      'Ekofisk started in 1971, had its best year in 2002, and spent 14 years within 10% of that best year.',
    )
  })
})
