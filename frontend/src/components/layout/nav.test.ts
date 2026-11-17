import { describe, expect, it } from 'vitest'
import { pageLabel } from './nav'

describe('pageLabel', () => {
  it.each([
    ['/', 'Shelf map'],
    ['/fields', 'Field deep dive'],
    ['/fields/3420717', 'Field deep dive'],
    ['/lifecycles', 'Field lifecycles'],
    ['/lifecycles/', 'Field lifecycles'],
    ['/wells', 'Page not found'],
    ['/fieldsx', 'Page not found'],
  ])('%s is "%s"', (path, label) => {
    expect(pageLabel(path)).toBe(label)
  })
})
