import { describe, expect, it } from 'vitest'
import land from '@/assets/map/land.geojson?raw'
import waterlines from '@/assets/map/waterlines.geojson?raw'
import type { FieldSummary } from '@/lib/api/types'
import { CHART_COLOURS } from '@/lib/charts/colours'
import { fields } from '@/test/fixtures'
import {
  circleRadius,
  describeShelfMap,
  fieldBounds,
  fieldTooltipLines,
  graticuleLabels,
  GRATICULE_STEP,
  fieldKind,
  CIRCLE_FADE,
  FIELD_LAYERS,
  NORTH_SEA_VIEW,
  OUTLINE_ZOOM,
  fieldPoints,
  outlineLayers,
  outlineStates,
  producingCount,
  shelfMapStyle,
} from './shelf-map'

const [volve, sindre, berling] = fields
const field = (changes: Partial<FieldSummary>): FieldSummary => ({ ...volve, ...changes })

describe('fieldKind', () => {
  it('sorts fields by the chosen year: producing that year, stopped before it, or not started yet', () => {
    expect(fieldKind(volve, 2012)).toBe('producing')
    expect(fieldKind(volve, 2020)).toBe('stopped')
    expect(fieldKind(volve, 2000)).toBe('not-yet')
    expect(fieldKind(berling, 2025)).toBe('not-yet')
  })

  it('counts a year with no production between producing years as stopped (Sindre in 2020)', () => {
    expect(fieldKind(sindre, 2020)).toBe('stopped')
    expect(fieldKind(sindre, 2021)).toBe('producing')
  })

  it('goes by production, not by status (Vest Ekofisk is "approved" but produced in 1977)', () => {
    expect(fieldKind(field({ status: 'Approved for production', producing_years: [1977] }), 1977)).toBe('producing')
  })
})

describe('producingCount', () => {
  it('counts every field with production in the year, mapped or not', () => {
    expect(producingCount(fields, 2012)).toBe(1)
    expect(producingCount(fields, 2025)).toBe(1)
    expect(producingCount(fields, 2020)).toBe(0)
  })

})

describe('circleRadius', () => {
  it('is 2.5 + 11 × √(share of the largest field), as design v2 sets it', () => {
    expect(circleRadius(0, 100)).toBe(2.5)
    expect(circleRadius(100, 100)).toBe(13.5)
    expect(circleRadius(25, 100)).toBe(2.5 + 11 * 0.5)
  })
})

describe('fieldTooltipLines', () => {
  it('gives name, coordinates, main product, first production, shutdown and total, from the API values', () => {
    expect(fieldTooltipLines(volve)).toEqual([
      'Volve',
      '58°26′N 001°53′E',
      'Oil',
      'First production 2008',
      'Shut down after 2016',
      '11.4 million Sm³ o.e. produced',
    ])
  })

  it('leaves out the shutdown for a field still producing, and the coordinates when there are none', () => {
    expect(fieldTooltipLines(sindre)).toEqual(['Sindre', 'Gas', 'First production 2017', '0.3 million Sm³ o.e. produced'])
  })

  it('says when a field has not produced', () => {
    expect(fieldTooltipLines(berling)).toEqual(['Berling', '65°11′N 006°22′E', 'Gas', 'No production yet'])
  })
})

describe('fieldPoints', () => {
  const points = fieldPoints(fields, 2012)

  it('puts every field with a location on the map, and skips Sindre, which has none', () => {
    expect(points.features.map((f) => f.properties.name).sort()).toEqual(['Berling', 'Volve'])
  })

  it('places each point at the API location, as [longitude, latitude]', () => {
    const v = points.features.find((f) => f.properties.name === 'Volve')!
    expect(v.geometry.coordinates).toEqual([1.886, 58.4385])
  })

  it('marks each point with its kind in the chosen year', () => {
    const kinds = Object.fromEntries(points.features.map((f) => [f.properties.name, f.properties.kind]))
    expect(kinds).toEqual({ Volve: 'producing', Berling: 'not-yet' })
    const later = fieldPoints(fields, 2020).features.find((f) => f.properties.name === 'Volve')!
    expect(later.properties.kind).toBe('stopped')
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
  const style = shelfMapStyle('/assets/land.geojson', '/assets/waterlines.geojson', fieldPoints(fields, 2012))
  const layer = (id: string) => style.layers.find((l) => l.id === id) as { filter: unknown; paint: Record<string, unknown> }
  const text = JSON.stringify(style)

  it('loads nothing from other sites: no tile server, fonts or icons', () => {
    expect(text).not.toMatch(/https?:/)
    expect(style).not.toHaveProperty('glyphs')
    expect(style).not.toHaveProperty('sprite')
    expect(style.sources.land.data).toBe('/assets/land.geojson')
    expect(style.sources.waterlines.data).toBe('/assets/waterlines.geojson')
  })

  it('looks like a printed sea chart: sea, land with a coastline, three waterlines and a light graticule', () => {
    expect(layer('sea').paint['background-color']).toBe(CHART_COLOURS.sea)
    expect(layer('land').paint['fill-color']).toBe(CHART_COLOURS.land)
    expect(layer('coast').paint).toMatchObject({ 'line-color': CHART_COLOURS.landEdge, 'line-width': 1 })
    const water = style.layers.filter((l) => l.id.startsWith('waterline-')) as { paint: Record<string, unknown> }[]
    expect(water.map((l) => l.paint['line-offset'])).toEqual([-3, -7, -12])
    expect(water.every((l) => l.paint['line-color'] === CHART_COLOURS.waterLine)).toBe(true)
    expect(layer('graticule-coarse').paint['line-color']).toBe(CHART_COLOURS.grid)
  })

  it('draws stopped fields as rings at 0.75, not-yet fields at 0.14, and producing fields filled, all with a 1.5px edge', () => {
    expect(layer('fields-stopped').filter).toEqual(['==', ['get', 'kind'], 'stopped'])
    expect(layer('fields-stopped').paint).toMatchObject({ 'circle-opacity': 0, 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 0.75 })
    expect(layer('fields-not-yet').filter).toEqual(['==', ['get', 'kind'], 'not-yet'])
    expect(layer('fields-not-yet').paint['circle-stroke-opacity']).toBe(0.14)
    expect(layer('fields-producing').paint['circle-color']).toEqual(['match', ['get', 'product'], 'oil', CHART_COLOURS.oil, CHART_COLOURS.gas])
    expect(layer('fields-producing').paint['circle-stroke-width']).toBe(1.5)
  })

  it('puts a 1.5px sea halo under every circle, so circles that touch stay apart', () => {
    expect(layer('fields-halo').paint).toEqual({ 'circle-radius': ['+', ['get', 'radius'], 1.5], 'circle-color': CHART_COLOURS.sea })
  })

  it('draws the producing fields last, on top', () => {
    expect(style.layers.at(-1)!.id).toBe('fields-producing')
  })

  it('describes the map for screen readers, with the counts for the chosen year', () => {
    expect(describeShelfMap(fieldPoints(fields, 2020), 2020)).toBe(
      'Map of the Norwegian Continental Shelf in 2020, with 2 fields as circles sized by total production and coloured by main product. 0 produced that year, 1 had stopped, and 1 had not started.',
    )
  })
})

describe('outlines', () => {
  const [fill, line] = outlineLayers()

  it('fill and edge the outlines from the outline source, only once zoomed in', () => {
    expect([fill.id, line.id]).toEqual(['outlines-fill', 'outlines-line'])
    expect(fill.source).toBe('outlines')
    expect(fill.minzoom).toBe(OUTLINE_ZOOM.start)
    expect(line.minzoom).toBe(OUTLINE_ZOOM.start)
  })

  it('colour by main product, from the outline properties', () => {
    expect(fill.paint['fill-color']).toEqual(['match', ['get', 'main_product'], 'oil', CHART_COLOURS.oil, CHART_COLOURS.gas])
  })

  it('fill at 0.45 when producing that year, with a 1.2px edge, faint like the circles when stopped or not started', () => {
    const text = JSON.stringify([fill.paint, line.paint])
    expect(text).toContain(JSON.stringify(['match', ['feature-state', 'kind'], 'producing', 0.45, 0]))
    expect(line.paint['line-width']).toBe(1.2)
    expect(text).toContain(JSON.stringify(['match', ['feature-state', 'kind'], 'producing', 1, 'stopped', 0.75, 0.14]))
  })

  it('fade in over the same zooms as the circles fade out', () => {
    const zoomStops = (value: unknown) => (value as unknown[]).slice(3).filter((_, i) => i % 2 === 0)
    expect(zoomStops(fill.paint['fill-opacity'])).toEqual([OUTLINE_ZOOM.start, OUTLINE_ZOOM.end])
    expect(zoomStops(CIRCLE_FADE['fields-producing']['circle-opacity'])).toEqual([OUTLINE_ZOOM.start, OUTLINE_ZOOM.end])
    expect(Object.keys(CIRCLE_FADE).sort()).toEqual(['fields-halo', ...FIELD_LAYERS].sort())
  })

  it('load before they show, and show fully by the zoom the North Sea button goes to', () => {
    expect(OUTLINE_ZOOM.load).toBeLessThan(OUTLINE_ZOOM.start)
    expect(OUTLINE_ZOOM.start).toBeLessThan(OUTLINE_ZOOM.end)
  })

  it('get each field\'s kind for the year, by field id', () => {
    expect(outlineStates(fields, 2020)).toEqual([
      { id: 3420717, kind: 'stopped' },
      { id: 29401178, kind: 'stopped' },
      { id: 42002473, kind: 'not-yet' },
    ])
  })

  it('the North Sea view is a box around the northern North Sea fields', () => {
    const [west, south, east, north] = NORTH_SEA_VIEW
    expect(west).toBeLessThan(east)
    expect(south).toBeLessThan(north)
    // Volve is in the southern part of this view
    expect(volve.lat).toBeGreaterThan(south)
    expect(volve.lon).toBeGreaterThan(west)
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

describe('bundled waterline coast (waterlines.geojson)', () => {
  const data = JSON.parse(waterlines) as { features: { geometry: { type: string; coordinates: number[][][] } }[] }
  const lines = data.features[0].geometry.coordinates

  it('is a smooth copy of the larger land areas only, made by scripts/make_waterlines.py', () => {
    expect(data.features[0].geometry.type).toBe('MultiLineString')
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.length).toBeLessThan(50)
  })

  it('has closed lines, so the waterlines go all the way round', () => {
    for (const line of lines) expect(line[0]).toEqual(line.at(-1))
  })
})

describe('graticule', () => {
  it('steps 2° of latitude and 4° of longitude on the whole shelf, and 1° when zoomed in', () => {
    expect(GRATICULE_STEP).toEqual({ coarse: { lat: 2, lon: 4 }, fine: { lat: 1, lon: 1 } })
  })

  it('labels the lines like 60°N and 4°E, for the map edge', () => {
    const { lats, lons } = graticuleLabels(GRATICULE_STEP.coarse)
    expect(lats.find((l) => l.value === 60)?.text).toBe('60°N')
    expect(lons.find((l) => l.value === 4)?.text).toBe('4°E')
    expect(lons.find((l) => l.value === 0)?.text).toBe('0°E')
    expect(lons.find((l) => l.value === -4)?.text).toBe('4°W')
  })
})
