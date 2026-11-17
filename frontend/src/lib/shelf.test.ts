import { describe, expect, it } from 'vitest'
import type { FieldSummary } from '@/lib/api/types'
import { fields } from '@/test/fixtures'
import { fieldCounts, firstField, yearRange } from './shelf'

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
