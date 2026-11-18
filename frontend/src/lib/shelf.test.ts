import { describe, expect, it } from 'vitest'
import type { FieldSummary } from '@/lib/api/types'
import { fields } from '@/test/fixtures'
import { LARGEST_FIELDS_COUNT, gasShare, largestFields, yearRange } from './shelf'

const field = (changes: Partial<FieldSummary>): FieldSummary => ({ ...fields[0], ...changes })

describe('yearRange', () => {
  it('runs from the first producing year to the last full year (Volve 2008 to Sindre 2025)', () => {
    expect(yearRange(fields, 2025)).toEqual([2008, 2025])
  })

  it('leaves out the year still in progress (Sindre has 2026, which is not a full year)', () => {
    expect(fields[1].producing_years).toContain(2026)
    expect(yearRange(fields, 2025)?.[1]).toBe(2025)
  })

  it('gives nothing when no field has produced', () => {
    expect(yearRange([fields[2]], 2025)).toBeNull()
  })
})

describe('largestFields', () => {
  it('ranks fields by total saleable production, largest first, and leaves out fields that never produced', () => {
    expect(largestFields(fields).map((f) => f.name)).toEqual(['Volve', 'Sindre'])
  })

  it('keeps only the first rows and does not change the list it was given', () => {
    const many = Array.from({ length: 12 }, (_, i) => field({ field_id: i, name: `F${i}`, cum_oe_net_msm3: i + 1 }))
    const top = largestFields(many)
    expect(top).toHaveLength(LARGEST_FIELDS_COUNT)
    expect(top[0].name).toBe('F11')
    expect(many[0].name).toBe('F0')
  })
})

describe('gasShare', () => {
  it('gives gas as a share of the total in the last full year and in the peak year', () => {
    const shelf = {
      years: [
        { year: 2004, liquids_net_msm3: 185.095, gas_net_bsm3: 79.311, oe_net_msm3: 264.406 },
        { year: 2025, liquids_net_msm3: 118.649, gas_net_bsm3: 121.831, oe_net_msm3: 240.48 },
      ],
      peak_year: 2004,
      peak_oe_net_msm3: 264.406,
      total_oe_net_msm3: 9100,
      producing_fields_now: 102,
    }
    const share = gasShare(shelf)!
    expect([share.last.year, Math.round(share.last.percent)]).toEqual([2025, 51])
    expect([share.peak.year, Math.round(share.peak.percent)]).toEqual([2004, 30])
  })

  it('gives nothing when there are no years', () => {
    expect(gasShare({ years: [], peak_year: 2004, peak_oe_net_msm3: 0, total_oe_net_msm3: 0, producing_fields_now: 0 })).toBeNull()
  })
})
