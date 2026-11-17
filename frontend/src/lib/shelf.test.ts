import { describe, expect, it } from 'vitest'
import type { FieldSummary } from '@/lib/api/types'
import { fields } from '@/test/fixtures'
import { fieldCounts, firstField } from './shelf'

const field = (changes: Partial<FieldSummary>): FieldSummary => ({ ...fields[0], ...changes })

describe('fieldCounts', () => {
  it('counts fields with a location, and those with no production at all (Volve, Sindre, Berling)', () => {
    // Volve is mapped and produced, Sindre has no outline, Berling is mapped but never produced
    expect(fieldCounts(fields)).toEqual({ mapped: 2, mappedNotProducedYet: 1 })
  })

  it('does not count an approved field that produced before as "not produced yet" (Vest Ekofisk)', () => {
    const vestEkofisk = field({ name: 'Vest Ekofisk', status: 'Approved for production', producing_years: [1977, 1978] })
    expect(fieldCounts([vestEkofisk]).mappedNotProducedYet).toBe(0)
  })
})

describe('firstField', () => {
  it('finds the field that produced first', () => {
    const ekofisk = field({ name: 'Ekofisk', first_production_year: 1971 })
    expect(firstField([...fields, ekofisk])).toEqual({ name: 'Ekofisk', year: 1971 })
  })

  it('skips fields that never produced, and gives nothing when none did', () => {
    expect(firstField([fields[2]])).toBeNull()
  })
})
