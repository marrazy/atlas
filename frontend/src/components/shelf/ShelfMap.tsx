import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { MaximizeIcon, MinusIcon, PlusIcon, type LucideIcon } from 'lucide-react'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import landUrl from '@/assets/map/land.geojson?url'
import type { FieldSummary } from '@/lib/api/types'
import {
  FIELD_LAYERS,
  LATITUDES,
  PLACE_LABELS,
  describeShelfMap,
  fieldBounds,
  fieldPoints,
  shelfMapStyle,
  type FieldFeatureProperties,
} from '@/lib/map/shelf-map'
import './shelf-map.css'

const ATTRIBUTION = 'MapLibre · Fields © Sodir (NLOD) · Coastline: Natural Earth'
const FIT_PADDING = 32

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
  /** Called when a field circle is clicked. */
  onSelectField: (fieldId: number) => void
}

export default function ShelfMap({ fields, onSelectField }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const selectField = useEffectEvent(onSelectField)
  const [overlay, setOverlay] = useState<Overlay>({ lat: [], places: [] })

  const points = useMemo(() => fieldPoints(fields), [fields])
  const bounds = useMemo(() => fieldBounds(fields), [fields])

  useEffect(() => {
    if (!container.current || !bounds) return
    // MapLibre builds its worker's address from a file name it makes at run time, which bundlers cannot follow.
    // So Vite copies the worker file as an asset, and MapLibre is told where it is before each map starts.
    maplibregl.setWorkerUrl(workerUrl)
    const map = new maplibregl.Map({
      container: container.current,
      style: shelfMapStyle(landUrl, points) as maplibregl.StyleSpecification,
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
    map.getCanvas().setAttribute('aria-label', describeShelfMap(points))

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 })
    for (const layer of FIELD_LAYERS) {
      map.on('mousemove', layer, (event: maplibregl.MapLayerMouseEvent) => {
        const props = event.features?.[0]?.properties as FieldFeatureProperties | undefined
        if (!props) return
        map.getCanvas().style.cursor = 'pointer'
        popup.setLngLat(event.lngLat).setText(props.hover).addTo(map)
      })
      map.on('mouseleave', layer, () => {
        map.getCanvas().style.cursor = ''
        popup.remove()
      })
      map.on('click', layer, (event: maplibregl.MapLayerMouseEvent) => {
        const props = event.features?.[0]?.properties as FieldFeatureProperties | undefined
        if (props) selectField(Number(props.field_id))
      })
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
      map.fitBounds(bounds, { padding: FIT_PADDING, animate: false })
      place()
    })

    return () => {
      popup.remove()
      map.remove()
      mapRef.current = null
    }
  }, [points, bounds])

  const animate = () => !prefersReducedMotion()
  const zoomIn = () => mapRef.current?.zoomIn({ animate: animate() })
  const zoomOut = () => mapRef.current?.zoomOut({ animate: animate() })
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
      <div className="absolute top-2.5 right-2.5 flex flex-col divide-y overflow-hidden rounded-lg border shadow-md">
        <MapButton label="Zoom in" icon={PlusIcon} onClick={zoomIn} />
        <MapButton label="Zoom out" icon={MinusIcon} onClick={zoomOut} />
        <MapButton label="Show the whole shelf" icon={MaximizeIcon} onClick={showAll} />
      </div>
    </div>
  )
}
