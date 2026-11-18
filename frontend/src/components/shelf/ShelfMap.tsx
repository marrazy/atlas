import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { MinusIcon, PlusIcon, type LucideIcon } from 'lucide-react'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import landUrl from '@/assets/map/land.geojson?url'
import waterlinesUrl from '@/assets/map/waterlines.geojson?url'
import { getFieldOutlines } from '@/lib/api/client'
import { describeError, isAbortError } from '@/lib/api/errors'
import type { FieldSummary } from '@/lib/api/types'
import {
  CIRCLE_FADE,
  FIELD_LABELS,
  FIELD_LAYERS,
  GRATICULE_STEP,
  KIND_OPACITY,
  NORTH_SEA_VIEW,
  OUTLINE_ZOOM,
  PLACE_LABELS,
  describeShelfMap,
  fieldBounds,
  fieldPoints,
  fieldTooltipLines,
  graticuleLabels,
  outlineLayers,
  outlineStates,
  shelfMapStyle,
  type FieldKind,
} from '@/lib/map/shelf-map'
import './shelf-map.css'

const FIT_PADDING = 24
/** Room outside the sea area for the degree labels: on the left for latitude, underneath for longitude. */
const GUTTER = { left: 40, bottom: 24 }
const SCALE_STEPS_KM = [10, 20, 50, 100, 200, 500, 1000]
const SCALE_MAX_PX = 80

type PaintName = Parameters<maplibregl.Map['setPaintProperty']>[1]
type PaintValue = Parameters<maplibregl.Map['setPaintProperty']>[2]

type Overlay = {
  lats: { text: string; y: number }[]
  lons: { text: string; x: number }[]
  places: { text: string; x: number; y: number }[]
  names: { id: number; text: string; x: number; y: number; opacity: number }[]
  view: string
  scale: { km: number; px: number } | null
}

const EMPTY: Overlay = { lats: [], lons: [], places: [], names: [], view: 'Whole shelf', scale: null }

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)

function MapButton({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center bg-card text-foreground transition-colors hover:bg-raised"
    >
      <Icon aria-hidden="true" strokeWidth={1.5} className="size-4" />
    </button>
  )
}

type Props = {
  fields: FieldSummary[]
  /** The year the circles are drawn for. */
  year: number
  /** Called when a field circle is clicked. */
  onSelectField: (fieldId: number) => void
}

export default function ShelfMap({ fields, year, onSelectField }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const selectField = useEffectEvent(onSelectField)
  const [overlay, setOverlay] = useState<Overlay>(EMPTY)
  const [outlineError, setOutlineError] = useState<string | null>(null)
  // set once the visitor uses a map button, so the map does not jump back when it finishes starting
  const moved = useRef(false)
  const outlineActions = useRef({ load: () => {}, retry: () => {} })

  const bounds = useMemo(() => fieldBounds(fields), [fields])
  const byId = useMemo(() => new Map(fields.map((f) => [f.field_id, f])), [fields])
  const tooltipHtml = useEffectEvent((fieldId: number) => {
    const field = byId.get(fieldId)
    if (!field) return ''
    const [first, ...rest] = fieldTooltipLines(field).map(escapeHtml)
    return `<div class="tip-title">${first}</div>${rest.map((line) => `<div>${line}</div>`).join('')}`
  })

  /** Everything drawn as HTML over the map: degree labels outside the edge, names, the view label and the scale. */
  const place = useEffectEvent((map: maplibregl.Map) => {
    const el = container.current
    if (!el) return
    const width = el.clientWidth
    const height = el.clientHeight
    const zoom = map.getZoom()
    const zoomed = zoom >= OUTLINE_ZOOM.start
    const centre = map.getCenter()
    const labels = graticuleLabels(zoomed ? GRATICULE_STEP.fine : GRATICULE_STEP.coarse)
    const points = fieldPoints(fields, year)
    const radius = new Map(points.features.map((f) => [f.properties.field_id, f.properties]))
    const named = new Set<string>(zoomed ? FIELD_LABELS.zoomed : FIELD_LABELS.shelf)

    const names = fields.flatMap((f) => {
      const props = radius.get(f.field_id)
      if (!named.has(f.name) || !props || f.lon === null || f.lat === null) return []
      const p = map.project([f.lon, f.lat])
      if (p.x < 0 || p.y < 0 || p.x > width || p.y > height) return []
      return [{ id: f.field_id, text: f.name, x: p.x + props.radius + 4, y: p.y, opacity: KIND_OPACITY[props.kind as FieldKind] }]
    })

    // the longest scale bar of a round distance that still fits in SCALE_MAX_PX
    const y = height - 20
    const metresPer100px = map.unproject([20, y]).distanceTo(map.unproject([120, y]))
    const kmPerPx = metresPer100px / 100 / 1000
    const km = [...SCALE_STEPS_KM].reverse().find((step) => step / kmPerPx <= SCALE_MAX_PX)
    const inNorthSea =
      centre.lng >= NORTH_SEA_VIEW[0] && centre.lng <= NORTH_SEA_VIEW[2] && centre.lat >= NORTH_SEA_VIEW[1] && centre.lat <= NORTH_SEA_VIEW[3]

    setOverlay({
      lats: labels.lats
        .map((l) => ({ text: l.text, y: map.project([centre.lng, l.value]).y }))
        .filter((l) => l.y > 8 && l.y < height - 8),
      lons: labels.lons
        .map((l) => ({ text: l.text, x: map.project([l.value, centre.lat]).x }))
        .filter((l) => l.x > 12 && l.x < width - 12),
      places: PLACE_LABELS.map((p) => ({ text: p.text, ...map.project([p.lon, p.lat]) })),
      names,
      view: !zoomed ? 'Whole shelf' : inNorthSea ? 'Northern North Sea, real field outlines' : 'Real field outlines',
      scale: km ? { km, px: km / kmPerPx } : null,
    })
  })

  /** Draws the circles for the current year. Only the field data changes, the map itself stays. */
  const showYear = useEffectEvent((map: maplibregl.Map) => {
    const points = fieldPoints(fields, year)
    ;(map.getSource('fields') as maplibregl.GeoJSONSource | undefined)?.setData(points)
    map.getCanvas().setAttribute('aria-label', describeShelfMap(points, year))
    if (map.getSource('outlines')) {
      for (const { id, kind } of outlineStates(fields, year)) map.setFeatureState({ source: 'outlines', id }, { kind })
    }
    place(map)
  })
  const firstPoints = useEffectEvent(() => fieldPoints(fields, year))

  useEffect(() => {
    if (!container.current || !bounds) return
    // MapLibre builds its worker's address from a file name it makes at run time, which bundlers cannot follow.
    // So Vite copies the worker file as an asset, and MapLibre is told where it is before each map starts.
    maplibregl.setWorkerUrl(workerUrl)
    const map = new maplibregl.Map({
      container: container.current,
      style: shelfMapStyle(landUrl, waterlinesUrl, firstPoints()) as maplibregl.StyleSpecification,
      bounds,
      fitBoundsOptions: { padding: FIT_PADDING },
      // wide enough that a short, wide card can still fit 56°N to 72°N; it only stops panning far away
      maxBounds: [-40, 46, 80, 80],
      renderWorldCopies: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      cooperativeGestures: true,
      attributionControl: false,
    })
    mapRef.current = map
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: 'field-tip' })
    const listen = (layer: string) => {
      map.on('mousemove', layer, (event: maplibregl.MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.field_id
        if (id === undefined) return
        map.getCanvas().style.cursor = 'pointer'
        popup.setLngLat(event.lngLat).setHTML(tooltipHtml(Number(id))).addTo(map)
      })
      map.on('mouseleave', layer, () => {
        map.getCanvas().style.cursor = ''
        popup.remove()
      })
      map.on('click', layer, (event: maplibregl.MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.field_id
        if (id !== undefined) selectField(Number(id))
      })
    }
    for (const layer of FIELD_LAYERS) listen(layer)

    // The outlines are about 320 kB, so they load only when the visitor zooms in far enough to see them.
    const controller = new AbortController()
    let outlines: 'waiting' | 'loading' | 'shown' | 'failed' = 'waiting'
    let styleReady = false
    // the circles only start to fade once MapLibre has the outlines ready to draw, so the map is never empty
    const fadeCircles = (event: maplibregl.MapSourceDataEvent) => {
      if (event.sourceId !== 'outlines' || !event.isSourceLoaded) return
      map.off('sourcedata', fadeCircles)
      for (const [layer, paint] of Object.entries(CIRCLE_FADE)) {
        for (const [name, value] of Object.entries(paint)) map.setPaintProperty(layer, name as PaintName, value as PaintValue)
        map.setLayerZoomRange(layer, 0, OUTLINE_ZOOM.end)
      }
    }
    const loadOutlines = (now = false) => {
      if (outlines !== 'waiting' || (!now && map.getZoom() < OUTLINE_ZOOM.load)) return
      outlines = 'loading'
      getFieldOutlines({ signal: controller.signal })
        .then((data) => {
          const add = () => {
            map.on('sourcedata', fadeCircles)
            map.addSource('outlines', { type: 'geojson', data, promoteId: 'field_id' } as maplibregl.SourceSpecification)
            for (const layer of outlineLayers()) map.addLayer(layer as maplibregl.LayerSpecification, 'fields-halo')
            listen('outlines-fill')
            outlines = 'shown'
            showYear(map)
          }
          // the zoom in button can be pressed before the map has finished starting
          if (styleReady) add()
          else map.once('load', add)
        })
        .catch((error: unknown) => {
          if (isAbortError(error)) return
          outlines = 'failed'
          setOutlineError(describeError(error))
        })
    }
    outlineActions.current = {
      load: () => loadOutlines(true),
      retry: () => {
        setOutlineError(null)
        outlines = 'waiting'
        loadOutlines(true)
      },
    }

    map.on('move', () => place(map))
    map.on('load', () => {
      // the card can change size while the map file loads, so fit all fields again once the map is ready
      map.resize()
      if (!moved.current) map.fitBounds(bounds, { padding: FIT_PADDING, animate: false })
      showYear(map)
      styleReady = true
      map.on('zoomend', () => loadOutlines())
      loadOutlines()
    })
    showYear(map)

    return () => {
      controller.abort()
      popup.remove()
      map.remove()
      mapRef.current = null
    }
  }, [bounds])

  useEffect(() => {
    if (mapRef.current) showYear(mapRef.current)
  }, [fields, year])

  const animate = () => !prefersReducedMotion()
  // the design's plus button goes to the northern North Sea, far enough in for the real outlines to show fully
  const showNorthSea = () => {
    const map = mapRef.current
    const camera = map?.cameraForBounds(NORTH_SEA_VIEW, { padding: FIT_PADDING })
    if (!map || !camera) return
    moved.current = true
    outlineActions.current.load()
    const zoom = Math.max(camera.zoom ?? 0, OUTLINE_ZOOM.end)
    if (animate()) map.flyTo({ ...camera, zoom })
    else map.jumpTo({ ...camera, zoom })
  }
  // and the minus button goes back to the whole shelf
  const showAll = () => {
    moved.current = true
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: FIT_PADDING, animate: animate() })
  }

  const box = 'rounded-md border bg-card'

  return (
    <div className="shelf-map relative" style={{ paddingLeft: GUTTER.left, paddingBottom: GUTTER.bottom }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 font-mono text-[11px] text-muted-foreground">
        {overlay.lats.map((l) => (
          <span key={l.text} className="absolute -translate-y-1/2 text-right" style={{ top: l.y, left: 0, width: GUTTER.left - 8 }}>
            {l.text}
          </span>
        ))}
        {overlay.lons.map((l) => (
          <span key={l.text} className="absolute -translate-x-1/2" style={{ left: GUTTER.left + l.x, bottom: 4 }}>
            {l.text}
          </span>
        ))}
      </div>
      <div className="relative h-[440px] overflow-hidden rounded-[10px] sm:h-[640px]">
        {/* MapLibre makes this element position: relative, so it is sized with height and width, not inset */}
        <div ref={container} className="h-full w-full" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {overlay.places.map((p) => (
            <span key={p.text} className="absolute -translate-y-1/2 text-xs text-muted-foreground" style={{ left: p.x, top: p.y }}>
              {p.text}
            </span>
          ))}
          {overlay.names.map((n) => (
            <span
              key={n.id}
              className="field-name absolute -translate-y-1/2 text-[11px] font-medium whitespace-nowrap text-foreground"
              style={{ left: n.x, top: n.y, opacity: n.opacity }}
            >
              {n.text}
            </span>
          ))}
          <span className={`absolute top-3 left-3 px-2.5 py-1 text-xs text-text-2 ${box}`}>{overlay.view}</span>
          {overlay.scale && (
            <span className={`absolute bottom-3 left-3 flex flex-col gap-1 px-2 py-1.5 ${box}`}>
              <span className="h-1 border border-t-0 border-foreground" style={{ width: overlay.scale.px }} />
              <span className="font-mono text-[11px] text-text-2">{overlay.scale.km} km</span>
            </span>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {overlay.view}
        </p>
        {outlineError && (
          <div role="alert" className="absolute top-12 left-3 max-w-[calc(100%-5rem)] rounded-lg border bg-card px-3 py-2 text-xs text-text-2">
            <p>Could not load the field outlines, so the map keeps the circles. {outlineError}</p>
            <button type="button" onClick={() => outlineActions.current.retry()} className="mt-1 text-foreground underline underline-offset-2">
              Try again
            </button>
          </div>
        )}
        <div className="absolute top-3 right-3 flex flex-col divide-y overflow-hidden rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <MapButton label="Zoom in to the northern North Sea" icon={PlusIcon} onClick={showNorthSea} />
          <MapButton label="Zoom out to the whole shelf" icon={MinusIcon} onClick={showAll} />
        </div>
      </div>
    </div>
  )
}
