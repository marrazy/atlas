import { describe, expect, it } from 'vitest'
import type { FieldSummary, Lifecycle } from '@/lib/api/types'
import { fields, lifecycles } from '@/test/fixtures'
import { findLifecycle, lifecycleLine, lifecycleStats, median, nearPeakFields } from './lifecycles'

const volve = lifecycles.fields[0]
const life = (changes: Partial<Lifecycle>): Lifecycle => ({ ...volve, ...changes })

describe('median', () => {
  it('takes the middle value of an odd count, in any order', () => {
    expect(median([5, 1, 3])).toBe(3)
  })

  it('takes the mean of the two middle values of an even count', () => {
    expect(median([4, 1, 2, 3])).toBe(2.5)
  })

  it('gives nothing for no values', () => {
    expect(median([])).toBeNull()
  })
})

describe('lifecycleStats', () => {
  it('counts the fields and takes the medians of years to the best year and years near it', () => {
    const set = {
      fields: [
        volve, // best year 1 year after the start, 1 year near peak
        life({ field_id: 2, first_year: 1971, peak_year: 2002, plateau_years: 14 }), // Ekofisk: 31 and 14
        life({ field_id: 3, first_year: 1990, peak_year: 1993, plateau_years: 2 }), // 3 and 2
      ],
      median: [],
    }
    expect(lifecycleStats(set)).toEqual({ compared: 3, bestAge: 3, nearPeakYears: 2 })
  })

  it('gives no medians when there are no fields', () => {
    expect(lifecycleStats({ fields: [], median: [] })).toEqual({ compared: 0, bestAge: null, nearPeakYears: null })
  })
})

describe('lifecycleLine', () => {
  it('keeps the points of a field with no gaps as they are', () => {
    expect(lifecycleLine(volve.series)).toEqual(volve.series)
  })

  it('puts an empty point where ages are skipped, so the line breaks there (Heimdal)', () => {
    expect(
      lifecycleLine([
        [0, 0.5],
        [1, 1],
        [4, 0.2],
        [5, 0.1],
      ]),
    ).toEqual([
      [0, 0.5],
      [1, 1],
      [2, null],
      [4, 0.2],
      [5, 0.1],
    ])
  })
})

describe('findLifecycle', () => {
  it('finds a field by id, or nothing when it is not in the set', () => {
    expect(findLifecycle(lifecycles, 3420717)?.name).toBe('Volve')
    expect(findLifecycle(lifecycles, 1)).toBeNull()
    expect(findLifecycle(lifecycles, null)).toBeNull()
  })
})

describe('nearPeakFields', () => {
  // four fields: sizes 100, 50, 20 and 5, with 2, 6, 6 and 1 years near peak
  const big = life({ field_id: 1, name: 'Big', plateau_years: 2 })
  const mid = life({ field_id: 2, name: 'Mid', plateau_years: 6 })
  const small = life({ field_id: 3, name: 'Small', plateau_years: 6 })
  const tiny = life({ field_id: 4, name: 'Tiny', plateau_years: 1 })
  const set = { fields: [tiny, small, mid, big], median: [] }
  const sizes: FieldSummary[] = [
    { ...fields[0], field_id: 1, cum_oe_net_msm3: 100 },
    { ...fields[0], field_id: 2, cum_oe_net_msm3: 50 },
    { ...fields[0], field_id: 3, cum_oe_net_msm3: 20 },
    { ...fields[0], field_id: 4, cum_oe_net_msm3: 5 },
  ]
  const names = (list: Lifecycle[]) => list.map((f) => f.name)

  it('keeps the largest fields, most years near peak first, and the larger field first when years are equal', () => {
    expect(names(nearPeakFields(set, sizes, [], 3))).toEqual(['Mid', 'Small', 'Big'])
  })

  it('adds the fields that can be highlighted, even when they are not among the largest', () => {
    expect(names(nearPeakFields(set, sizes, [4], 2))).toEqual(['Mid', 'Big', 'Tiny'])
  })

  it('does not list a field twice, and skips a pick that is not in the data', () => {
    expect(names(nearPeakFields(set, sizes, [1, 99], 2))).toEqual(['Mid', 'Big'])
  })
})
