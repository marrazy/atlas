import { describe, expect, it } from 'vitest'
import type { ProductionMonth } from '@/lib/api/types'
import { volveLateProduction } from '@/test/fixtures'
import { describeB, describeTimeToLimit, fitWindow } from './decline'

const month = (m: string, oil_rate: number): ProductionMonth => ({ month: m, oil_rate, gas_rate: 0, gor: null, oe_net_msm3: 0 })

describe('fitWindow', () => {
  it('gives Volve the window from the design: April 2015 to August 2016', () => {
    expect(fitWindow(volveLateProduction)).toEqual({ start: '2015-04', end: '2016-08' })
  })

  it('ends at the last month above the economic limit, so the shutdown month (Sep 2016, 287) is left out', () => {
    expect(volveLateProduction.at(-1)).toMatchObject({ month: '2016-09', oil_rate: 287 })
    expect(fitWindow(volveLateProduction)?.end).toBe('2016-08')
  })

  it('looks back no more than two years for the start, so an old peak is ignored', () => {
    const months = [
      month('2017-06', 9000),
      month('2018-01', 2000),
      month('2018-02', 1900),
      ...Array.from({ length: 12 }, (_, i) => month(`2019-${String(i + 1).padStart(2, '0')}`, 1800 - i * 50)),
    ]
    expect(fitWindow(months)).toEqual({ start: '2018-01', end: '2019-12' })
  })

  it('uses at least 12 months when the highest month is near the end', () => {
    const rising = Array.from({ length: 24 }, (_, i) => month(`20${20 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, 500 + i * 100))
    expect(fitWindow(rising)).toEqual({ start: '2021-01', end: '2021-12' })
  })

  it('starts no earlier than the first month of data', () => {
    const young = Array.from({ length: 5 }, (_, i) => month(`2025-0${i + 1}`, 5000 - i * 100))
    expect(fitWindow(young)).toEqual({ start: '2025-01', end: '2025-05' })
  })

  it('gives no window when no month reached the economic limit (a gas field with little oil)', () => {
    expect(fitWindow([month('2010-01', 120), month('2010-02', 299)])).toBeNull()
    expect(fitWindow([])).toBeNull()
  })
})

describe('describeB', () => {
  it('names the fixed b of the exponential and harmonic models', () => {
    expect(describeB({ model: 'exponential', b: 0, b_at_limit: false })).toBe('b = 0 (exponential)')
    expect(describeB({ model: 'harmonic', b: 1, b_at_limit: false })).toBe('b = 1 (harmonic)')
  })

  it('shows a fitted hyperbolic b with two decimals', () => {
    expect(describeB({ model: 'hyperbolic', b: 0.437, b_at_limit: false })).toBe('b = 0.44 (hyperbolic)')
  })

  it('says in plain words when b hit a limit, instead of a precise looking number (Volve hits the lower one)', () => {
    expect(describeB({ model: 'hyperbolic', b: 0.01, b_at_limit: true })).toBe(
      'b hit its lower limit, so this decline is really exponential.',
    )
    expect(describeB({ model: 'hyperbolic', b: 1, b_at_limit: true })).toBe(
      'b hit its upper limit, so this decline is really harmonic.',
    )
  })
})

describe('describeTimeToLimit', () => {
  it.each([
    [15, 'Reaches the economic limit after about 15 more months with this model.'],
    [59, 'Reaches the economic limit after about 4.9 more years with this model.'],
    [null, 'Does not reach the economic limit within 50 years with this model.'],
  ])('writes %s months as "%s"', (months, text) => {
    expect(describeTimeToLimit(months)).toBe(text)
  })
})
