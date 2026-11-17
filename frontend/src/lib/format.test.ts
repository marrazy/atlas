import { describe, expect, it } from 'vitest'
import { formatMonth } from './format'

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
