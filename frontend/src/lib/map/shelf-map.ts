import type { FieldSummary, MainProduct } from '@/lib/api/types'
import { CHART_COLOURS as C } from '@/lib/charts/colours'
import { formatNumber } from '@/lib/format'
import { formatCoordinates } from '@/lib/coordinates'
import { productLabel } from '@/lib/field'

/** Circle radius from design v2: about 2.5 + 11 × √(share of the largest field), in pixels. */
const MIN_RADIUS = 2.5
const RADIUS_RANGE = 11

/**
 * How a field is drawn for a year, from its production years only:
 * produced that year, produced before but not that year (shut down or paused), or not started yet.
 */
export type FieldKind = 'producing' | 'stopped' | 'not-yet'

export function fieldKind(field: FieldSummary, year: number): FieldKind {
  if (field.producing_years.includes(year)) return 'producing'
  return field.producing_years.some((y) => y < year) ? 'stopped' : 'not-yet'
}

/** How many fields had any production in the year, the count shown under the year slider. */
export function producingCount(fields: FieldSummary[], year: number): number {
  return fields.filter((f) => f.producing_years.includes(year)).length
}


/** Circle area grows with total production, so the radius grows with its square root. */
export function circleRadius(total: number, largest: number): number {
  if (largest <= 0) return MIN_RADIUS
  return MIN_RADIUS + RADIUS_RANGE * Math.sqrt(Math.max(total, 0) / largest)
}

/**
 * The tooltip for a field, from the API's fields only: name, position, main product, first production,
 * the shutdown year if there is one, and total production. The first line is the name.
 */
export function fieldTooltipLines(field: FieldSummary): string[] {
  const lines = [field.name]
  if (field.lat !== null && field.lon !== null) lines.push(formatCoordinates(field.lat, field.lon))
  lines.push(productLabel(field.main_product))
  if (field.first_production_year === null) {
    lines.push('No production yet')
    return lines
  }
  lines.push(`First production ${field.first_production_year}`)
  if (field.last_production_year !== null) lines.push(`Shut down after ${field.last_production_year}`)
  lines.push(`${formatNumber(field.cum_oe_net_msm3, 1)} million Sm³ o.e. produced`)
  return lines
}

export type FieldFeatureProperties = {
  field_id: number
  name: string
  product: MainProduct
  kind: FieldKind
  radius: number
}

/** The fields that have a location, as map points for a year, largest drawn last so they sit on top. */
export function fieldPoints(fields: FieldSummary[], year: number) {
  const located = fields.filter((f) => f.lon !== null && f.lat !== null)
  const largest = Math.max(0, ...located.map((f) => f.cum_oe_net_msm3))
  const features = located
    .map((f) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [f.lon as number, f.lat as number] },
      properties: {
        field_id: f.field_id,
        name: f.name,
        product: f.main_product,
        kind: fieldKind(f, year),
        radius: circleRadius(f.cum_oe_net_msm3, largest),
      } satisfies FieldFeatureProperties,
    }))
    .sort((a, b) => a.properties.radius - b.properties.radius)
  return { type: 'FeatureCollection' as const, features }
}

/** The box around every mapped field, as [west, south, east, north]. */
export function fieldBounds(fields: FieldSummary[]): [number, number, number, number] | null {
  const located = fields.filter((f) => f.lon !== null && f.lat !== null)
  if (located.length === 0) return null
  const lons = located.map((f) => f.lon as number)
  const lats = located.map((f) => f.lat as number)
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
}

/** Graticule steps from design v2: 2° of latitude and 4° of longitude on the whole shelf, 1° when zoomed in. */
export const GRATICULE_STEP = { coarse: { lat: 2, lon: 4 }, fine: { lat: 1, lon: 1 } } as const
const LAT_RANGE = [46, 80] as const
const LON_RANGE = [-32, 64] as const

const range = (from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step)

export function graticule(step: { lat: number; lon: number }) {
  const line = (coordinates: number[][]) => ({
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates },
  })
  return {
    type: 'FeatureCollection' as const,
    features: [
      ...range(LAT_RANGE[0], LAT_RANGE[1], step.lat).map((lat) => line([[LON_RANGE[0], lat], [LON_RANGE[1], lat]])),
      ...range(LON_RANGE[0], LON_RANGE[1], step.lon).map((lon) => line([[lon, LAT_RANGE[0]], [lon, LAT_RANGE[1]]])),
    ],
  }
}

/** The degree labels outside the map edge, like 60°N and 4°E, for the lines in view at this zoom. */
export function graticuleLabels(step: { lat: number; lon: number }) {
  return {
    lats: range(LAT_RANGE[0], LAT_RANGE[1], step.lat).map((lat) => ({ value: lat, text: `${lat}°N` })),
    lons: range(LON_RANGE[0], LON_RANGE[1], step.lon).map((lon) => ({
      value: lon,
      text: `${Math.abs(lon)}°${lon < 0 ? 'W' : 'E'}`,
    })),
  }
}

/** Sea and country names from the design, placed by hand. They are labels, not data. */
export const PLACE_LABELS = [
  { text: 'North Sea', lon: -2.6, lat: 57.8 },
  { text: 'Norwegian Sea', lon: -2.4, lat: 67.4 },
  { text: 'Barents Sea', lon: 26, lat: 73.4 },
  { text: 'Norway', lon: 9.6, lat: 61.8 },
]

/** The big fields named on the map, the same lists as the design, one for the whole shelf and one zoomed in. */
export const FIELD_LABELS = {
  shelf: ['Troll', 'Statfjord', 'Gullfaks', 'Ekofisk', 'Oseberg', 'Åsgard', 'Ormen Lange', 'Johan Sverdrup', 'Volve', 'Heidrun', 'Snøhvit', 'Johan Castberg', 'Goliat', 'Aasta Hansteen'],
  zoomed: ['Troll', 'Oseberg', 'Gullfaks', 'Statfjord', 'Snorre', 'Johan Sverdrup', 'Grane', 'Edvard Grieg', 'Volve', 'Sleipner Øst', 'Kvitebjørn', 'Gjøa', 'Visund', 'Brage', 'Heimdal'],
} as const

/** Opacity of a field and its name by its kind in the year, from the design's script. */
export const KIND_OPACITY: Record<FieldKind, number> = { producing: 1, stopped: 0.75, 'not-yet': 0.14 }

const kindIs = (kind: FieldKind) => ['==', ['get', 'kind'], kind]
const productColour = ['match', ['get', 'product'], 'oil', C.oil, C.gas]
const ring = (kind: FieldKind) => ({
  id: `fields-${kind}`,
  type: 'circle' as const,
  source: 'fields',
  filter: kindIs(kind),
  paint: {
    'circle-radius': ['get', 'radius'],
    'circle-color': C.sea,
    'circle-opacity': 0,
    'circle-stroke-color': productColour,
    'circle-stroke-width': 1.5,
    'circle-stroke-opacity': KIND_OPACITY[kind],
  },
})

/**
 * The whole map style, drawn like a printed sea chart. Everything comes from this site: no tiles, fonts or
 * images from other servers. Three thin waterlines follow the coast out to sea, and each circle sits on a
 * small sea-coloured halo so circles that touch stay apart.
 */
export function shelfMapStyle(landUrl: string, waterlinesUrl: string, points: ReturnType<typeof fieldPoints>) {
  const waterline = (offset: number) => ({
    id: `waterline-${offset}`,
    type: 'line' as const,
    source: 'waterlines',
    layout: { 'line-join': 'round' as const },
    paint: { 'line-color': C.waterLine, 'line-width': 1, 'line-offset': offset },
  })
  return {
    version: 8 as const,
    sources: {
      land: { type: 'geojson' as const, data: landUrl },
      // a smoother copy of the coast, so the waterlines do not crowd around every small island
      waterlines: { type: 'geojson' as const, data: waterlinesUrl },
      'graticule-coarse': { type: 'geojson' as const, data: graticule(GRATICULE_STEP.coarse) },
      'graticule-fine': { type: 'geojson' as const, data: graticule(GRATICULE_STEP.fine) },
      fields: { type: 'geojson' as const, data: points },
    },
    layers: [
      { id: 'sea', type: 'background' as const, paint: { 'background-color': C.sea } },
      {
        id: 'graticule-coarse',
        type: 'line' as const,
        source: 'graticule-coarse',
        maxzoom: OUTLINE_ZOOM.start,
        paint: { 'line-color': C.grid, 'line-width': 1 },
      },
      {
        id: 'graticule-fine',
        type: 'line' as const,
        source: 'graticule-fine',
        minzoom: OUTLINE_ZOOM.start,
        paint: { 'line-color': C.grid, 'line-width': 1 },
      },
      ...WATERLINE_OFFSETS.map(waterline),
      { id: 'land', type: 'fill' as const, source: 'land', paint: { 'fill-color': C.land } },
      { id: 'coast', type: 'line' as const, source: 'land', paint: { 'line-color': C.landEdge, 'line-width': 1 } },
      {
        id: 'fields-halo',
        type: 'circle' as const,
        source: 'fields',
        paint: { 'circle-radius': ['+', ['get', 'radius'], 1.5], 'circle-color': C.sea },
      },
      ring('not-yet'),
      ring('stopped'),
      {
        id: 'fields-producing',
        type: 'circle' as const,
        source: 'fields',
        filter: kindIs('producing'),
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': productColour,
          'circle-stroke-color': productColour,
          'circle-stroke-width': 1.5,
        },
      },
    ],
  }
}

/**
 * Pixels from the coast for the three waterlines, about 3, 7 and 12 in the design. The land rings in the data
 * run so that a negative offset moves a line out to sea; the browser check confirmed the lines sit on the water.
 */
export const WATERLINE_OFFSETS = [-3, -7, -12]

export const FIELD_LAYERS = ['fields-producing', 'fields-stopped', 'fields-not-yet']
const CIRCLE_LAYERS = ['fields-halo', ...FIELD_LAYERS]

/**
 * Zoom levels for the real field outlines. They load a little before they show,
 * then fade in while the circles fade out. At zoom 5.5 a 40 km wide field like Troll is about 50 pixels wide.
 */
export const OUTLINE_ZOOM = { load: 4.25, start: 4.75, end: 5.5 } as const

/** The view for the design's "Zoom in to the northern North Sea" button, as [west, south, east, north]. */
export const NORTH_SEA_VIEW: [number, number, number, number] = [1.5, 58.2, 4.5, 61.6]

const fadeOut = (value: number) => ['interpolate', ['linear'], ['zoom'], OUTLINE_ZOOM.start, value, OUTLINE_ZOOM.end, 0]
const fadeIn = (value: unknown) => ['interpolate', ['linear'], ['zoom'], OUTLINE_ZOOM.start, 0, OUTLINE_ZOOM.end, value]

/** Circle opacity once the outlines are on the map. Until then, or if they fail to load, the circles stay at every zoom. */
export const CIRCLE_FADE: Record<string, Record<string, unknown>> = {
  'fields-halo': { 'circle-opacity': fadeOut(1) },
  'fields-not-yet': { 'circle-stroke-opacity': fadeOut(KIND_OPACITY['not-yet']) },
  'fields-stopped': { 'circle-stroke-opacity': fadeOut(KIND_OPACITY.stopped) },
  'fields-producing': { 'circle-opacity': fadeOut(1), 'circle-stroke-opacity': fadeOut(1) },
}
export { CIRCLE_LAYERS }

// The year changes every 220 ms while playing, so each outline gets its kind as feature state
// instead of sending all the outline shapes to the map again.
const stateKind = ['feature-state', 'kind']
const outlineColour = ['match', ['get', 'main_product'], 'oil', C.oil, C.gas]

/** Outlines drawn like the circles: filled at 0.45 when producing that year, an outline only when stopped or not started. */
export function outlineLayers() {
  return [
    {
      id: 'outlines-fill',
      type: 'fill' as const,
      source: 'outlines',
      minzoom: OUTLINE_ZOOM.start,
      paint: {
        'fill-color': outlineColour,
        'fill-opacity': fadeIn(['match', stateKind, 'producing', 0.45, 0]),
      },
    },
    {
      id: 'outlines-line',
      type: 'line' as const,
      source: 'outlines',
      minzoom: OUTLINE_ZOOM.start,
      paint: {
        'line-color': outlineColour,
        'line-width': 1.2,
        'line-opacity': fadeIn(['match', stateKind, 'producing', 1, 'stopped', KIND_OPACITY.stopped, KIND_OPACITY['not-yet']]),
      },
    },
  ]
}

/** Each field's kind in the year, keyed by field id, for the outline feature states. */
export function outlineStates(fields: FieldSummary[], year: number) {
  return fields.map((f) => ({ id: f.field_id, kind: fieldKind(f, year) }))
}

export function describeShelfMap(points: ReturnType<typeof fieldPoints>, year: number): string {
  const count = (kind: FieldKind) => points.features.filter((f) => f.properties.kind === kind).length
  return `Map of the Norwegian Continental Shelf in ${year}, with ${points.features.length} fields as circles sized by total production and coloured by main product. ${count('producing')} produced that year, ${count('stopped')} had stopped, and ${count('not-yet')} had not started.`
}
