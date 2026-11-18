import { describe, expect, it } from 'vitest'
import { formatCoordinates } from './coordinates'

describe('formatCoordinates', () => {
  it('writes a position the way a navigator does: two-digit latitude, three-digit longitude, minutes rounded', () => {
    expect(formatCoordinates(58.4385, 1.886)).toBe('58°26′N 001°53′E')
  })

  it('carries rounded minutes into the next degree instead of writing 60′', () => {
    expect(formatCoordinates(60.9999, 3.9999)).toBe('61°00′N 004°00′E')
  })

  it('writes south and west for negative values', () => {
    expect(formatCoordinates(-1.5, -2.25)).toBe('01°30′S 002°15′W')
  })
})
