import { describe, expect, it } from 'vitest'
import { volveProduction } from '@/test/fixtures'
import { foldForSearch, matchField, producingLifeYears, productLabel, productionSpan } from './field'

describe('labels', () => {
  it('writes the main product with a capital letter', () => {
    expect(productLabel('oil')).toBe('Oil')
    expect(productLabel('gas')).toBe('Gas')
  })
})

describe('producingLifeYears', () => {
  it('counts the months from the first to the last month with production, in years (Volve: 103 months, 8.6 years)', () => {
    expect(producingLifeYears({ first: '2008-02', last: '2016-09' })).toBeCloseTo(103 / 12)
    expect(producingLifeYears({ first: '2008-02', last: '2016-09' }).toFixed(1)).toBe('8.6')
  })

  it('is zero for a field that produced for one month', () => {
    expect(producingLifeYears({ first: '2020-05', last: '2020-05' })).toBe(0)
  })
})

describe('productionSpan', () => {
  it('gives the first and last month with output', () => {
    expect(productionSpan(volveProduction)).toEqual({ first: '2008-02', last: '2008-05' })
  })

  it('gives null for a field that never produced', () => {
    expect(productionSpan([])).toBeNull()
  })
})

describe('field search', () => {
  it.each([
    ['Åsgard', 'asgard'],
    ['Bøyla', 'boyla'],
    ['Ærfugl Nord', 'aerfugl nord'],
    ['Oseberg Øst', 'oseberg ost'],
    ['Snøhvit', 'snohvit'],
  ])('folds %s to "%s"', (name, folded) => {
    expect(foldForSearch(name)).toBe(folded)
  })

  it('finds Norwegian names when typed without Norwegian letters, or with them', () => {
    const asgard = [foldForSearch('Åsgard')]
    expect(matchField('43765', 'asgard', asgard)).toBe(1)
    expect(matchField('43765', 'Åsg', asgard)).toBe(1)
  })

  it('puts names that start with the search before names that only contain it', () => {
    expect(matchField('1', 'ose', [foldForSearch('Oseberg')])).toBe(1)
    expect(matchField('2', 'ose', [foldForSearch('Tommeliten Gamma')])).toBe(0)
    expect(matchField('3', 'berg', [foldForSearch('Oseberg')])).toBe(0.5)
  })

  it('shows every field when the search is empty', () => {
    expect(matchField('1', '  ', [foldForSearch('Volve')])).toBe(1)
  })
})
