import { describe, expect, it } from 'vitest'
import type { Lifecycle } from '@/lib/api/types'
import { lifecycles } from '@/test/fixtures'
import { findLifecycle, lifecycleLine, lifecycleStats, median } from './lifecycles'

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
