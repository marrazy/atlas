// ECharts and MapLibre draw on a canvas, which cannot read CSS variables, so the design v2 colours are repeated here.
// A test checks that every value still matches :root in src/index.css.
export const CHART_COLOURS = {
  page: '#f6f6f7',
  card: '#ffffff',
  raised: '#f1f1f3',
  line: 'rgba(23, 23, 23, 0.09)',
  text: '#171717',
  text2: '#525252',
  muted: '#6b6b6b',
  oil: '#d95926',
  gas: '#3987e5',
  chartGrid: 'rgba(23, 23, 23, 0.08)',
  otherLine: '#c3c3c8',
  neutralBar: '#d0d0d4',
  sea: '#edf2f5',
  land: '#e7e2d8',
  landEdge: '#c9c0b0',
  waterLine: 'rgba(57, 110, 160, 0.2)',
  grid: 'rgba(23, 23, 23, 0.06)',
} as const

export const CHART_FONTS = {
  sans: "'Geist Variable', Geist, ui-sans-serif, system-ui, sans-serif",
  mono: "'Geist Mono Variable', 'Geist Mono', ui-monospace, monospace",
} as const

/** The tooltip box from the design: white, a 1px line border, radius 8px, 12px text. */
export const TOOLTIP_STYLE = {
  backgroundColor: CHART_COLOURS.card,
  borderColor: CHART_COLOURS.line,
  borderWidth: 1,
  padding: [8, 12],
  extraCssText: 'border-radius: 8px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);',
  textStyle: { color: CHART_COLOURS.text, fontFamily: CHART_FONTS.sans, fontSize: 12 },
}

/** Axis labels from the design: Geist Mono 11px in the muted colour. */
export const AXIS_LABEL = { color: CHART_COLOURS.muted, fontFamily: CHART_FONTS.mono, fontSize: 11 }

/** Grid lines are 1px solid, and there are no axis lines or ticks. */
export const SPLIT_LINE = { lineStyle: { color: CHART_COLOURS.chartGrid, width: 1, type: 'solid' as const } }
