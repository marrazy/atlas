import { describe, expect, it } from 'vitest'
import { volve, volveProduction } from '@/test/fixtures'
import {
  areaLabel,
  describeField,
  foldForSearch,
  hydrocarbonLabel,
  matchField,
  productLabel,
  productionSpan,
} from './field'

describe('labels', () => {
  it.each([
    ['OIL', 'Oil'],
    ['GAS', 'Gas'],
    ['OIL/GAS', 'Oil and gas'],
    ['GAS/CONDENSATE', 'Gas and condensate'],
    ['OIL/CONDENSATE', 'Oil and condensate'],
  ])('writes the hydrocarbon type %s as "%s"', (hcType, expected) => {
    expect(hydrocarbonLabel(hcType)).toBe(expected)
  })

  it.each([
    ['North sea', 'North Sea'],
    ['Norwegian sea', 'Norwegian Sea'],
    ['Barents sea', 'Barents Sea'],
  ])('writes the area %s as "%s"', (area, expected) => {
    expect(areaLabel(area)).toBe(expected)
  })

  it('writes the main product with a capital letter', () => {
    expect(productLabel('oil')).toBe('Oil')
    expect(productLabel('gas')).toBe('Gas')
  })
})

describe('describeField', () => {
  it('describes Volve from its Sodir data', () => {
    expect(describeField(volve)).toBe('Oil field in the North Sea, discovered in 1993. Operated by Equinor Energy AS.')
  })

  it('leaves out the operator when Sodir has none', () => {
    expect(describeField({ ...volve, hc_type: 'GAS/CONDENSATE', main_area: 'Norwegian sea', operator_full: null })).toBe(
      'Gas and condensate field in the Norwegian Sea, discovered in 1993.',
    )
  })

  it('leaves out the discovery year when it is missing', () => {
    expect(describeField({ ...volve, discovery_year: null, operator_full: null })).toBe('Oil field in the North Sea.')
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
