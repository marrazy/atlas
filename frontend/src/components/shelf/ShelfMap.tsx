import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { MaximizeIcon, MinusIcon, PlusIcon, ScanSearchIcon, type LucideIcon } from 'lucide-react'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import landUrl from '@/assets/map/land.geojson?url'
import { getFieldOutlines } from '@/lib/api/client'
import { describeError, isAbortError } from '@/lib/api/errors'
import type { FieldSummary } from '@/lib/api/types'
import {
  CIRCLE_FADE,
  FIELD_LAYERS,
  LATITUDES,
  NORTH_SEA_VIEW,
  OUTLINE_ZOOM,
  PLACE_LABELS,
  describeShelfMap,
  fieldBounds,
  fieldHoverText,
  fieldPoints,
  outlineLayers,
  outlineStates,
  shelfMapStyle,
} from '@/lib/map/shelf-map'
import './shelf-map.css'

const ATTRIBUTION = 'MapLibre · Fields © Sodir (NLOD) · Coastline: Natural Earth'
const FIT_PADDING = 32

type PaintName = Parameters<maplibregl.Map['setPaintProperty']>[1]
type PaintValue = Parameters<maplibregl.Map['setPaintProperty']>[2]

type Overlay = { lat: { lat: number; y: number }[]; places: { text: string; x: number; y: number }[] }

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function MapButton({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center bg-card text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Icon aria-hidden="true" className="size-4" />
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
  const [overlay, setOverlay] = useState<Overlay>({ lat: [], places: [] })
  const [outlineError, setOutlineError] = useState<string | null>(null)
  // set once the visitor uses a map button, so the map does not jump back when it finishes starting
  const moved = useRef(false)
  const outlineActions = useRef({ load: () => {}, retry: () => {} })

  const bounds = useMemo(() => fieldBounds(fields), [fields])
  const hoverTexts = useMemo(() => new Map(fields.map((f) => [f.field_id, fieldHoverText(f)])), [fields])
  const hoverText = useEffectEvent((fieldId: number) => hoverTexts.get(fieldId) ?? '')

  /** Draws the circles for the current year. Only the field data changes, the map itself stays. */
  const showYear = useEffectEvent((map: maplibregl.Map) => {
    const points = fieldPoints(fields, year)
    ;(map.getSource('fields') as maplibregl.GeoJSONSource | undefined)?.setData(points)
    map.getCanvas().setAttribute('aria-label', describeShelfMap(points, year))
    if (map.getSource('outlines')) {
      for (const { id, kind } of outlineStates(fields, year)) map.setFeatureState({ source: 'outlines', id }, { kind })
    }
  })
  const firstPoints = useEffectEvent(() => fieldPoints(fields, year))

  useEffect(() => {
    if (!container.current || !bounds) return
    // MapLibre builds its worker's address from a file name it makes at run time, which bundlers cannot follow.
    // So Vite copies the worker file as an asset, and MapLibre is told where it is before each map starts.
    maplibregl.setWorkerUrl(workerUrl)
    const map = new maplibregl.Map({
      container: container.current,
      style: shelfMapStyle(landUrl, firstPoints()) as maplibregl.StyleSpecification,
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
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    map.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: ATTRIBUTION }), 'bottom-right')

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 })
    const listen = (layer: string) => {
      map.on('mousemove', layer, (event: maplibregl.MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.field_id
        if (id === undefined) return
        map.getCanvas().style.cursor = 'pointer'
        popup.setLngLat(event.lngLat).setText(hoverText(Number(id))).addTo(map)
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
            for (const layer of outlineLayers()) map.addLayer(layer as maplibregl.LayerSpecification, 'fields-not-yet')
            listen('outlines-fill')
            outlines = 'shown'
            showYear(map)
          }
          // the North Sea button can be pressed before the map has finished starting
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

    const place = () => {
      const height = container.current?.clientHeight ?? 0
      const centre = map.getCenter().lng
      setOverlay({
        lat: LATITUDES.map((lat) => ({ lat, y: map.project([centre, lat]).y })).filter((l) => l.y > 12 && l.y < height - 12),
        places: PLACE_LABELS.map((p) => ({ text: p.text, ...map.project([p.lon, p.lat]) })),
      })
    }
    map.on('move', place)
    map.on('load', () => {
      // the card can change size while the map file loads, so fit all fields again once the map is ready
      map.resize()
      if (!moved.current) map.fitBounds(bounds, { padding: FIT_PADDING, animate: false })
      showYear(map)
      place()
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
  const zoomIn = () => {
    moved.current = true
    mapRef.current?.zoomIn({ animate: animate() })
  }
  const zoomOut = () => {
    moved.current = true
    mapRef.current?.zoomOut({ animate: animate() })
  }
  // on a small card the North Sea fits at a lower zoom, so go at least far enough for the outlines to show fully
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
  const showAll = () => bounds && mapRef.current?.fitBounds(bounds, { padding: FIT_PADDING, animate: animate() })

  return (
    <div className="shelf-map relative h-[420px] overflow-hidden rounded-[10px] border sm:h-[560px]">
      {/* MapLibre makes this element position: relative, so it is sized with height and width, not inset */}
      <div ref={container} className="h-full w-full" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {overlay.lat.map((l) => (
          <span key={l.lat} className="absolute left-1.5 -translate-y-full font-mono text-[11px] text-muted-foreground" style={{ top: l.y }}>
            {l.lat}°N
          </span>
        ))}
        {overlay.places.map((p) => (
          <span
            key={p.text}
            className="absolute text-[11px] tracking-[2px] text-muted-foreground uppercase"
            style={{ left: p.x, top: p.y }}
          >
            {p.text}
          </span>
        ))}
      </div>
      {outlineError && (
        <div role="alert" className="absolute top-2.5 left-2.5 max-w-[calc(100%-5rem)] rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
          <p>Could not load the field outlines, so the map keeps the circles. {outlineError}</p>
          <button type="button" onClick={() => outlineActions.current.retry()} className="mt-1 font-medium underline underline-offset-2">
            Try again
          </button>
        </div>
      )}
      <div className="absolute top-2.5 right-2.5 flex flex-col divide-y overflow-hidden rounded-lg border shadow-md">
        <MapButton label="Zoom in" icon={PlusIcon} onClick={zoomIn} />
        <MapButton label="Zoom out" icon={MinusIcon} onClick={zoomOut} />
        <MapButton label="Zoom in to the northern North Sea" icon={ScanSearchIcon} onClick={showNorthSea} />
        <MapButton label="Show the whole shelf" icon={MaximizeIcon} onClick={showAll} />
      </div>
    </div>
  )
}
