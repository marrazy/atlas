import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { setWindowWidth } from '@/test/render-app'
import { COMPACT_MAX_WIDTH, useCompact } from './use-compact'

describe('useCompact', () => {
  it('is true on a phone-sized screen and false from the sm width up', () => {
    setWindowWidth(375)
    expect(renderHook(() => useCompact()).result.current).toBe(true)
    setWindowWidth(COMPACT_MAX_WIDTH + 1)
    expect(renderHook(() => useCompact()).result.current).toBe(false)
  })
})
