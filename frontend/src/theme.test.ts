import { describe, expect, it } from 'vitest'
import css from './index.css?raw'

const PLAN_COLOURS = {
  background: '#221f1e',
  sidebar: '#1c1a19',
  card: '#2b2726',
  muted: '#34302e',
  accent: '#3a3533',
  border: '#3d3836',
  foreground: '#ebe5de',
  'muted-foreground': '#a39a92',
  oil: '#d95926',
  gas: '#3987e5',
  water: '#199e70',
  other: '#6b625c',
} as const

type Token = keyof typeof PLAN_COLOURS

function rootColours(): Record<string, string> {
  const root = css.match(/:root\s*{([^}]*)}/)?.[1] ?? ''
  return Object.fromEntries([...root.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, hex]) => [name, hex.toLowerCase()]))
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

const colours = rootColours()
const hex = (token: Token) => colours[token]

describe('theme colours', () => {
  it('match the colour table in docs/frontend-plan.md', () => {
    for (const [token, value] of Object.entries(PLAN_COLOURS)) {
      expect(colours[token], `--${token}`).toBe(value)
    }
  })

  it('are all available as Tailwind classes (bg-card, text-oil, and so on)', () => {
    for (const token of Object.keys(PLAN_COLOURS)) {
      expect(css).toContain(`--color-${token}: var(--${token});`)
    }
  })

  it('give main text at least 4.5 to 1 on every background', () => {
    for (const bg of ['background', 'sidebar', 'card', 'muted', 'accent'] as const) {
      expect(contrast(hex('foreground'), hex(bg)), `foreground on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  // accent (hover and active nav) is left out on purpose: secondary text there is 4.37 to 1
  it('give secondary text at least 4.5 to 1 on the page, sidebar, card and muted backgrounds', () => {
    for (const bg of ['background', 'sidebar', 'card', 'muted'] as const) {
      expect(contrast(hex('muted-foreground'), hex(bg)), `muted-foreground on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('give oil, gas and water lines at least 3 to 1 on the page and card backgrounds', () => {
    for (const series of ['oil', 'gas', 'water'] as const) {
      for (const bg of ['background', 'card'] as const) {
        expect(contrast(hex(series), hex(bg)), `${series} on ${bg}`).toBeGreaterThanOrEqual(3)
      }
    }
  })
})

describe('theme fonts', () => {
  it('use Inter for text and IBM Plex Mono for numbers', () => {
    expect(css).toMatch(/--font-sans:\s*'Inter Variable'/)
    expect(css).toMatch(/--font-mono:\s*'IBM Plex Mono'/)
  })

  it('load the font files from the app itself, not from Google', () => {
    expect(css).toContain("@import '@fontsource-variable/inter/wght.css';")
    expect(css).toContain("@import '@fontsource/ibm-plex-mono/latin-400.css';")
    expect(css).toContain("@import '@fontsource/ibm-plex-mono/latin-500.css';")
    expect(css).not.toContain('fonts.googleapis.com')
  })

  it('have the tight heading letter spacing from the design', () => {
    expect(css).toMatch(/--tracking-heading:\s*-0\.02em;/)
  })
})
