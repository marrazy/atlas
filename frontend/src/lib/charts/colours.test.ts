import { describe, expect, it } from 'vitest'
import css from '@/index.css?raw'
import { CHART_COLOURS } from './colours'

const CSS_NAMES: Record<keyof typeof CHART_COLOURS, string> = {
  page: 'page',
  card: 'card',
  raised: 'raised',
  line: 'line',
  text: 'text',
  text2: 'text-2',
  muted: 'muted-foreground',
  oil: 'oil',
  gas: 'gas',
  chartGrid: 'chart-grid',
  otherLine: 'other-line',
  neutralBar: 'neutral-bar',
  sea: 'sea',
  land: 'land',
  landEdge: 'land-edge',
  waterLine: 'water-line',
  grid: 'grid',
}

describe('CHART_COLOURS', () => {
  it.each(Object.entries(CSS_NAMES))('%s matches --%s in index.css', (key, cssName) => {
    const value = css.match(new RegExp(`--${cssName}:\\s*(#[0-9a-f]{6}|rgba\\([^)]*\\));`, 'i'))?.[1]
    expect(CHART_COLOURS[key as keyof typeof CHART_COLOURS]).toBe(value)
  })

  it('keeps none of the dark warm colours from the first design', () => {
    for (const old of ['#221f1e', '#2b2726', '#34302e', '#3d3836', '#ebe5de', '#a39a92', '#6b625c']) {
      expect(css.toLowerCase()).not.toContain(old)
    }
  })
})
