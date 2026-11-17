import { describe, expect, it } from 'vitest'
import land from '@/assets/map/land.geojson?raw'
import type { FieldSummary } from '@/lib/api/types'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { fields } from '@/test/fixtures'
import {
  circleRadius,
  describeShelfMap,
  fieldBounds,
  fieldHoverText,
  fieldKind,
  fieldPoints,
  shelfMapStyle,
} from './shelf-map'

const [volve, sindre, berling] = fields
const field = (changes: Partial<FieldSummary>): FieldSummary => ({ ...volve, ...changes })

describe('fieldKind', () => {
  it('sorts fields into producing, shut down, and never produced', () => {
    expect(fieldKind(field({ status: 'Producing' }))).toBe('producing')
    expect(fieldKind(volve)).toBe('shut-down')
    expect(fieldKind(berling)).toBe('no-production')
  })

  it('treats an approved field that produced before by its production, not its status (Vest Ekofisk)', () => {
    expect(fieldKind(field({ status: 'Approved for production', producing_years: [1977] }))).toBe('producing')
  })
})

describe('circleRadius', () => {
  it('runs from 4 for nothing to 22 for the largest field', () => {
    expect(circleRadius(0, 100)).toBe(4)
    expect(circleRadius(100, 100)).toBe(22)
  })

  it('grows with the square root, so circle area follows production', () => {
    expect(circleRadius(25, 100)).toBe(4 + 18 * 0.5)
  })
})

describe('fieldHoverText', () => {
  it('describes a field from its API values, in the design style', () => {
    expect(fieldHoverText(volve)).toBe(
      'Volve · oil · first production 2008, shut down after 2016, 11.4 million Sm³ o.e. produced',
    )
  })

  it('leaves out the shutdown for a field still producing', () => {
    expect(fieldHoverText(sindre)).toBe('Sindre · gas · first production 2017, 0.3 million Sm³ o.e. produced')
  })

  it('says when a field has not produced', () => {
    expect(fieldHoverText(berling)).toBe('Berling · gas · no production yet')
  })
})

describe('fieldPoints', () => {
  const points = fieldPoints(fields)

  it('puts every field with a location on the map, and skips Sindre, which has none', () => {
    expect(points.features.map((f) => f.properties.name).sort()).toEqual(['Berling', 'Volve'])
  })

  it('places each point at the API location, as [longitude, latitude]', () => {
    const v = points.features.find((f) => f.properties.name === 'Volve')!
    expect(v.geometry.coordinates).toEqual([1.886, 58.4385])
  })

  it('draws the smallest first, so large circles never hide small ones underneath', () => {
    const radii = points.features.map((f) => f.properties.radius)
    expect(radii).toEqual([...radii].sort((a, b) => a - b))
  })

  it('gives the box around the mapped fields', () => {
    expect(fieldBounds(fields)).toEqual([1.886, 58.4385, 6.3668, 65.1792])
    expect(fieldBounds([sindre])).toBeNull()
  })
})

describe('shelfMapStyle', () => {
  const style = shelfMapStyle('/assets/land.geojson', fieldPoints(fields))
  const text = JSON.stringify(style)

  it('loads nothing from other sites: no tile server, fonts or icons', () => {
    expect(text).not.toMatch(/https?:/)
    expect(style).not.toHaveProperty('glyphs')
    expect(style).not.toHaveProperty('sprite')
    expect(style.sources.land.data).toBe('/assets/land.geojson')
  })

  it('draws shut down fields as rings and producing fields as filled circles', () => {
    const layer = (id: string) => style.layers.find((l) => l.id === id) as { filter: unknown; paint: Record<string, unknown> }
    expect(layer('fields-shut-down').filter).toEqual(['==', ['get', 'kind'], 'shut-down'])
    expect(layer('fields-shut-down').paint['circle-stroke-width']).toBe(2)
    expect(layer('fields-producing').paint['circle-color']).toEqual(['match', ['get', 'product'], 'oil', CHART_COLOURS.oil, CHART_COLOURS.gas])
  })

  it('draws the producing fields last, on top', () => {
    expect(style.layers.at(-1)!.id).toBe('fields-producing')
  })

  it('describes the map for screen readers with the number of fields', () => {
    expect(describeShelfMap(fieldPoints(fields))).toBe(
      'Map of the Norwegian Continental Shelf with 2 fields as circles sized by total production, coloured by main product, with shut down fields as rings.',
    )
  })
})

describe('bundled coastline (land.geojson)', () => {
  const data = JSON.parse(land) as { type: string; features: { geometry: { type: string; coordinates: number[][][][] } }[] }
  const rings = data.features[0].geometry.coordinates.flat()

  it('is one MultiPolygon feature', () => {
    expect(data.type).toBe('FeatureCollection')
    expect(data.features[0].geometry.type).toBe('MultiPolygon')
  })

  it('stays inside the cut box, 30°W to 60°E and 46°N to 80°N', () => {
    for (const [lon, lat] of rings.flat()) {
      expect(lon).toBeGreaterThanOrEqual(-30)
      expect(lon).toBeLessThanOrEqual(60)
      expect(lat).toBeGreaterThanOrEqual(46)
      expect(lat).toBeLessThanOrEqual(80)
    }
  })

  it('has closed rings, as GeoJSON requires', () => {
    for (const ring of rings) expect(ring[0]).toEqual(ring.at(-1))
  })
})
