import { describe, expect, it } from 'vitest'
import { isPageFileError } from './page-errors'

describe('isPageFileError', () => {
  it.each([
    ['Chrome', 'Failed to fetch dynamically imported module: https://atlas.arrazy.com/assets/FieldPage-old.js'],
    ['Firefox', 'error loading dynamically imported module: https://atlas.arrazy.com/assets/FieldPage-old.js'],
    ['Safari', 'Importing a module script failed.'],
  ])('knows the %s message for a page file that failed to download', (_browser, message) => {
    expect(isPageFileError(new TypeError(message))).toBe(true)
  })

  it('does not take other errors for a failed download', () => {
    expect(isPageFileError(new TypeError("Cannot read properties of undefined (reading 'name')"))).toBe(false)
    expect(isPageFileError('Failed to fetch')).toBe(false)
  })
})
