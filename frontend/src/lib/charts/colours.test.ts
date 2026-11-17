import { describe, expect, it } from 'vitest'
import css from '@/index.css?raw'
import { CHART_COLOURS } from './colours'

const CSS_NAMES: Record<keyof typeof CHART_COLOURS, string> = {
  background: 'background',
  card: 'card',
  muted: 'muted',
  border: 'border',
  foreground: 'foreground',
  mutedForeground: 'muted-foreground',
  oil: 'oil',
  gas: 'gas',
  water: 'water',
  other: 'other',
}

describe('CHART_COLOURS', () => {
  it.each(Object.entries(CSS_NAMES))('%s matches --%s in index.css', (key, cssName) => {
    const value = css.match(new RegExp(`--${cssName}:\\s*(#[0-9a-f]{6});`, 'i'))?.[1]
    expect(CHART_COLOURS[key as keyof typeof CHART_COLOURS]).toBe(value)
  })
})
