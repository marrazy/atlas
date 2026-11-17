// ECharts draws on a canvas, which cannot read CSS variables, so the theme colours are repeated here.
// A test checks that every value still matches :root in src/index.css.
export const CHART_COLOURS = {
  background: '#221f1e',
  card: '#2b2726',
  muted: '#34302e',
  border: '#3d3836',
  foreground: '#ebe5de',
  mutedForeground: '#a39a92',
  oil: '#d95926',
  gas: '#3987e5',
  water: '#199e70',
  other: '#6b625c',
} as const

export const CHART_FONTS = {
  sans: "'Inter Variable', Inter, ui-sans-serif, system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
} as const
