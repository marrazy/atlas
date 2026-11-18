import { describe, expect, it } from 'vitest'
import css from './index.css?raw'

/** The colour table in docs/design-v2.md, section 2. */
const SPEC_COLOURS = {
  page: '#f6f6f7',
  card: '#ffffff',
  raised: '#f1f1f3',
  line: 'rgba(23, 23, 23, 0.09)',
  text: '#171717',
  'text-2': '#525252',
  'muted-foreground': '#6b6b6b',
  sidebar: '#141415',
  'sidebar-text': '#ededed',
  'sidebar-text-2': '#a1a1a6',
  'sidebar-muted': '#85858b',
  'sidebar-active': '#232325',
  'sidebar-line': 'rgba(237, 237, 237, 0.08)',
  oil: '#d95926',
  gas: '#3987e5',
  'tint-oil': '#fcefe7',
  'tint-gas': '#ebf2fc',
  positive: '#16a34a',
  sea: '#edf2f5',
  land: '#e7e2d8',
  'land-edge': '#c9c0b0',
  'water-line': 'rgba(57, 110, 160, 0.2)',
  grid: 'rgba(23, 23, 23, 0.06)',
  'chart-grid': 'rgba(23, 23, 23, 0.08)',
  'other-line': '#c3c3c8',
  'neutral-bar': '#d0d0d4',
} as const

function rootColours(): Record<string, string> {
  const root = css.match(/:root\s*{([^}]*)}/)?.[1] ?? ''
  return Object.fromEntries(
    [...root.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6}|rgba\([^)]*\))/gi)].map(([, name, value]) => [name, value.toLowerCase()]),
  )
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

describe('design v2 colours', () => {
  it('match the colour table in docs/design-v2.md', () => {
    for (const [token, value] of Object.entries(SPEC_COLOURS)) {
      expect(colours[token], `--${token}`).toBe(value)
    }
  })

  it('use no colour outside that table, since there is no other colour in the interface', () => {
    const allowed = new Set<string>(Object.values(SPEC_COLOURS))
    for (const [token, value] of Object.entries(colours)) {
      expect(allowed.has(value), `--${token} is ${value}`).toBe(true)
    }
  })

  it('give main text at least 4.5 to 1 on every light background', () => {
    for (const bg of ['page', 'card', 'raised', 'tint-oil', 'tint-gas'] as const) {
      expect(contrast(colours.text, colours[bg]), `text on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('give secondary and muted text at least 4.5 to 1 on every light background', () => {
    for (const fg of ['text-2', 'muted-foreground'] as const) {
      for (const bg of ['page', 'card', 'raised', 'tint-oil', 'tint-gas', 'sea'] as const) {
        expect(contrast(colours[fg], colours[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('give every sidebar text colour at least 4.5 to 1 on the sidebar and its active row', () => {
    for (const fg of ['sidebar-text', 'sidebar-text-2', 'sidebar-muted'] as const) {
      expect(contrast(colours[fg], colours.sidebar), `${fg} on sidebar`).toBeGreaterThanOrEqual(4.5)
    }
    for (const fg of ['sidebar-text', 'sidebar-text-2'] as const) {
      expect(contrast(colours[fg], colours['sidebar-active']), `${fg} on the active row`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('give oil and gas lines at least 3 to 1 on white cards', () => {
    for (const series of ['oil', 'gas'] as const) {
      expect(contrast(colours[series], colours.card), `${series} on card`).toBeGreaterThanOrEqual(3)
    }
  })

  it('keep none of the dark warm colours from the first design', () => {
    for (const old of ['#221f1e', '#2b2726', '#34302e', '#3d3836', '#ebe5de', '#a39a92', '#6b625c', '#1c1a19', '#199e70']) {
      expect(css.toLowerCase()).not.toContain(old)
    }
  })
})

const SHADCN_TOKENS = [
  'background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground', 'primary',
  'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent',
  'accent-foreground', 'destructive', 'border', 'input', 'ring', 'sidebar', 'sidebar-foreground',
]

describe('shadcn/ui colours', () => {
  it('define every colour the components use, as a Tailwind class too', () => {
    for (const token of SHADCN_TOKENS) {
      expect(colours[token], `--${token}`).toBeDefined()
      expect(css).toContain(`--color-${token}: var(--${token});`)
    }
  })

  it('follow the mapping in section 2 of the spec', () => {
    expect(colours.background).toBe(SPEC_COLOURS.page)
    expect(colours.card).toBe(SPEC_COLOURS.card)
    expect(colours.foreground).toBe(SPEC_COLOURS.text)
    expect(colours.muted).toBe(SPEC_COLOURS.raised)
    expect(colours.border).toBe(SPEC_COLOURS.line)
    expect(colours.primary).toBe(SPEC_COLOURS.text)
    expect(colours['primary-foreground']).toBe(SPEC_COLOURS.card)
    expect(colours.sidebar).toBe(SPEC_COLOURS.sidebar)
  })

  it('use a light theme only, with nothing left from the shadcn defaults', () => {
    expect(css).toMatch(/color-scheme:\s*light;/)
    expect(css).not.toMatch(/\.dark\s*{/)
    expect(css).not.toContain('oklch(')
    expect(css).not.toContain('--chart-1')
  })

  it('draw the focus ring as 2px solid text colour, 2px away', () => {
    expect(colours.ring).toBe(SPEC_COLOURS.text)
    expect(css).toMatch(/outline:\s*2px solid var\(--ring\);\s*outline-offset:\s*2px;/)
  })

  it('use an 8px base radius for buttons and inputs, 14px for cards, and the one easing curve', () => {
    expect(css).toMatch(/--radius:\s*0\.5rem;/)
    expect(css).toMatch(/--radius-card:\s*14px;/)
    expect(css).toMatch(/--shadow-card:\s*0 1px 2px rgba\(0, 0, 0, 0\.04\);/)
    expect(css).toContain('cubic-bezier(0.22, 1, 0.36, 1)')
  })
})

describe('theme fonts', () => {
  it('use Geist for text and Geist Mono for numbers', () => {
    expect(css).toMatch(/--font-sans:\s*'Geist Variable'/)
    expect(css).toMatch(/--font-mono:\s*'Geist Mono Variable'/)
  })

  it('load the font files from the app itself, not from Google', () => {
    expect(css).toContain("@import '@fontsource-variable/geist/wght.css';")
    expect(css).toContain("@import '@fontsource-variable/geist-mono/wght.css';")
    expect(css).not.toContain('fonts.googleapis.com')
    expect(css).not.toMatch(/Inter|IBM Plex/)
  })

  it('have no letter spacing and tabular numbers everywhere', () => {
    expect(css).not.toMatch(/tracking|letter-spacing/)
    expect(css).toContain('font-variant-numeric: tabular-nums;')
  })
})
