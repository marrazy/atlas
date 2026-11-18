import { describe, expect, it } from 'vitest'
import type { ProductionMonth } from '@/lib/api/types'
import { volveLateProduction } from '@/test/fixtures'
import { DECLINE_MODELS, VOLVE_MODEL_NOTES, describeBLimit, describeTimeToLimit, fitWindow, formatB } from './decline'

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

describe('formatB', () => {
  it('gives the fixed b of the exponential and harmonic models', () => {
    expect(formatB({ model: 'exponential', b: 0 })).toBe('0')
    expect(formatB({ model: 'harmonic', b: 1 })).toBe('1')
  })

  it('gives a fitted hyperbolic b with two decimals (Volve: 0.01)', () => {
    expect(formatB({ model: 'hyperbolic', b: 0.437 })).toBe('0.44')
    expect(formatB({ model: 'hyperbolic', b: 0.01 })).toBe('0.01')
  })
})

describe('describeBLimit', () => {
  it('says in plain words when b hit a limit, so b is not read as precise (Volve hits the lower one)', () => {
    expect(describeBLimit({ model: 'hyperbolic', b: 0.01, b_at_limit: true })).toBe(
      'b hit its lower limit, so this decline is really exponential',
    )
    expect(describeBLimit({ model: 'hyperbolic', b: 1, b_at_limit: true })).toBe(
      'b hit its upper limit, so this decline is really harmonic',
    )
  })

  it('says nothing when b is inside its range, or for the fixed models', () => {
    expect(describeBLimit({ model: 'hyperbolic', b: 0.4, b_at_limit: false })).toBeNull()
    expect(describeBLimit({ model: 'exponential', b: 0, b_at_limit: false })).toBeNull()
  })
})

describe('describeTimeToLimit', () => {
  it.each([
    [15, 'Reaches 300 Sm³/day after about 15 more months'],
    [59, 'Reaches 300 Sm³/day after about 59 more months'],
    [1, 'Reaches 300 Sm³/day after about 1 more month'],
    [null, 'Does not reach the limit within 50 years'],
  ])('writes %s months as "%s"', (months, text) => {
    expect(describeTimeToLimit(months)).toBe(text)
  })
})

describe('model notes', () => {
  it('end without a full stop, as design v2 asks', () => {
    for (const note of [...DECLINE_MODELS.map((m) => m.note), ...Object.values(VOLVE_MODEL_NOTES)]) {
      expect(note).not.toMatch(/\.$/)
    }
  })

  it('keep the Volve wording for Volve only, and a general version for other fields', () => {
    expect(VOLVE_MODEL_NOTES.exponential).toBe('Constant decline rate. The most cautious forecast, and the best fit for Volve')
    for (const m of DECLINE_MODELS) expect(m.note).not.toContain('Volve')
  })
})
