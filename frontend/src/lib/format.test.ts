import { describe, expect, it } from 'vitest'
import { formatCompact, formatMonth, formatNumber, monthOf, monthStart } from './format'

describe('formatCompact', () => {
  it.each([
    [0, '0'],
    [200, '200'],
    [2500, '2.5k'],
    [10000, '10k'],
    [64883, '64.9k'],
    [1000000, '1M'],
  ])('writes %s as "%s" for axis labels', (value, expected) => {
    expect(formatCompact(value)).toBe(expected)
  })
})

describe('monthStart and monthOf', () => {
  it('turn a month into UTC time and back', () => {
    expect(monthStart('2008-12')).toBe(Date.UTC(2008, 11, 1))
    expect(monthOf(monthStart('2008-12'))).toBe('2008-12')
    expect(monthOf(monthStart('2009-01'))).toBe('2009-01')
  })
})

describe('formatNumber', () => {
  it('groups thousands with commas and rounds to whole numbers by default', () => {
    expect(formatNumber(8923.8 * 6.2898)).toBe('56,129')
  })

  it('keeps a fixed number of decimals when asked', () => {
    expect(formatNumber(63.335, 1)).toBe('63.3')
    expect(formatNumber(0, 1)).toBe('0.0')
    expect(formatNumber(456.25, 1)).toBe('456.3')
  })
})

describe('formatMonth', () => {
  it.each([
    ['2026-08', 'Aug 2026'],
    ['2008-02', 'Feb 2008'],
    ['2016-09', 'Sep 2016'],
    ['2008-12', 'Dec 2008'],
  ])('writes %s as "%s", like the design', (month, expected) => {
    expect(formatMonth(month)).toBe(expected)
  })

  it('can write the month in full', () => {
    expect(formatMonth('2026-08', 'long')).toBe('August 2026')
  })

  it('does not move to the month before in time zones west of London', () => {
    expect(formatMonth('2026-01')).toBe('Jan 2026')
  })
})
