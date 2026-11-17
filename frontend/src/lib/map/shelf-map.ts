import type { FieldSummary, MainProduct } from '@/lib/api/types'
import { CHART_COLOURS as C } from '@/lib/charts/colours'
import { formatNumber } from '@/lib/format'
import { productLabel } from '@/lib/field'

/** Map colours from the design's map (docs/design/Main.dc.html). The series colours come from the theme. */
export const MAP_COLOURS = {
  sea: '#262220',
  land: '#3a3432',
  coast: '#554d49',
  grid: '#36312f',
} as const

const MIN_RADIUS = 4
const MAX_RADIUS = 22

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

/** Fields that produced in the year but have no location in the data, so they have no circle (Sindre). */
export function producingNotMapped(fields: FieldSummary[], year: number): number {
  return fields.filter((f) => f.producing_years.includes(year) && (f.lon === null || f.lat === null)).length
}

/** Circle area grows with total production, so the radius grows with its square root. */
export function circleRadius(total: number, largest: number): number {
  if (largest <= 0) return MIN_RADIUS
  return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.sqrt(Math.max(total, 0) / largest)
}

/** The hover text for a field, in the design's style, built from the API's fields only. */
export function fieldHoverText(field: FieldSummary): string {
  const parts = [field.name, productLabel(field.main_product).toLowerCase()]
  if (field.producing_years.length === 0) return `${parts.join(' · ')} · no production yet`
  let text = `${parts.join(' · ')} · first production ${field.first_production_year}`
  if (field.last_production_year !== null) text += `, shut down after ${field.last_production_year}`
  return `${text}, ${formatNumber(field.cum_oe_net_msm3, 1)} million Sm³ o.e. produced`
}

export type FieldFeatureProperties = {
  field_id: number
  name: string
  product: MainProduct
  kind: FieldKind
  radius: number
  hover: string
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
        hover: fieldHoverText(f),
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

/** Lines of latitude every 2 degrees, like the design. */
export const LATITUDES = [48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78]
const LONGITUDES = Array.from({ length: 22 }, (_, i) => -28 + i * 4)

export function graticule() {
  const line = (coordinates: number[][]) => ({
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates },
  })
  return {
    type: 'FeatureCollection' as const,
    features: [
      ...LATITUDES.map((lat) => line([[-30, lat], [60, lat]])),
      ...LONGITUDES.map((lon) => line([[lon, 46], [lon, 80]])),
    ],
  }
}

/** Sea and country names from the design, placed by hand. They are labels, not data. */
export const PLACE_LABELS = [
  { text: 'North Sea', lon: 1.2, lat: 57.4 },
  { text: 'Norwegian Sea', lon: 1.5, lat: 67 },
  { text: 'Barents Sea', lon: 30, lat: 73.6 },
  { text: 'Norway', lon: 9.6, lat: 61.8 },
]

const kindIs = (kind: FieldKind) => ['==', ['get', 'kind'], kind]
const productColour = ['match', ['get', 'product'], 'oil', C.oil, C.gas]

/** The whole map style. Everything comes from this site: no tiles, fonts or images from other servers. */
export function shelfMapStyle(landUrl: string, points: ReturnType<typeof fieldPoints>) {
  return {
    version: 8 as const,
    sources: {
      land: { type: 'geojson' as const, data: landUrl },
      graticule: { type: 'geojson' as const, data: graticule() },
      fields: { type: 'geojson' as const, data: points },
    },
    layers: [
      { id: 'sea', type: 'background' as const, paint: { 'background-color': MAP_COLOURS.sea } },
      { id: 'graticule', type: 'line' as const, source: 'graticule', paint: { 'line-color': MAP_COLOURS.grid, 'line-width': 1 } },
      { id: 'land', type: 'fill' as const, source: 'land', paint: { 'fill-color': MAP_COLOURS.land } },
      { id: 'coast', type: 'line' as const, source: 'land', paint: { 'line-color': MAP_COLOURS.coast, 'line-width': 1 } },
      {
        id: 'fields-not-yet',
        type: 'circle' as const,
        source: 'fields',
        filter: kindIs('not-yet'),
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': MAP_COLOURS.sea,
          'circle-stroke-color': productColour,
          'circle-stroke-width': 1,
          'circle-stroke-opacity': 0.5,
        },
      },
      {
        id: 'fields-stopped',
        type: 'circle' as const,
        source: 'fields',
        filter: kindIs('stopped'),
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': MAP_COLOURS.sea,
          'circle-stroke-color': productColour,
          'circle-stroke-width': 2,
        },
      },
      {
        id: 'fields-producing',
        type: 'circle' as const,
        source: 'fields',
        filter: kindIs('producing'),
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': productColour,
          'circle-opacity': 0.85,
          'circle-stroke-color': MAP_COLOURS.sea,
          'circle-stroke-width': 1,
        },
      },
    ],
  }
}

export const FIELD_LAYERS = ['fields-producing', 'fields-stopped', 'fields-not-yet']

export function describeShelfMap(points: ReturnType<typeof fieldPoints>, year: number): string {
  const count = (kind: FieldKind) => points.features.filter((f) => f.properties.kind === kind).length
  return `Map of the Norwegian Continental Shelf in ${year}, with ${points.features.length} fields as circles sized by total production and coloured by main product. ${count('producing')} produced that year, ${count('stopped')} had stopped, and ${count('not-yet')} had not started.`
}
