import { vi } from 'vitest'

type Handler = (event: unknown) => void

/** jsdom has no WebGL, so tests use this in place of maplibre-gl. It records what the map was asked to do. */
export class Map {
  static last: Map | null = null
  options: Record<string, unknown>
  controls: unknown[] = []
  handlers: { event: string; layer?: string; fn: Handler }[] = []
  canvas = document.createElement('canvas')
  container: HTMLElement
  zoomIn = vi.fn()
  zoomOut = vi.fn()
  fitBounds = vi.fn()
  resize = vi.fn()
  remove = vi.fn()
  fieldsSource = { setData: vi.fn() }
  sources: Record<string, unknown> = {}
  /** The zoom the map reports. The whole shelf is about zoom 3. */
  zoom = 3
  addSource = vi.fn((id: string, source: unknown) => {
    this.sources[id] = source
    return this
  })
  addLayer = vi.fn()
  setPaintProperty = vi.fn()
  setLayerZoomRange = vi.fn()
  setFeatureState = vi.fn()
  flyTo = vi.fn()
  jumpTo = vi.fn()
  cameraForBounds = vi.fn(() => ({ center: { lng: 3, lat: 59.9 }, zoom: 4.2, bearing: 0 }))
  touchZoomRotate = { disableRotation: vi.fn() }
  keyboard = { disableRotation: vi.fn() }

  constructor(options: Record<string, unknown>) {
    this.options = options
    this.container = options.container as HTMLElement
    Map.last = this
  }

  addControl(control: unknown) {
    this.controls.push(control)
    return this
  }
  on(event: string, layerOrFn: string | Handler, fn?: Handler) {
    if (typeof layerOrFn === 'function') this.handlers.push({ event, fn: layerOrFn })
    else this.handlers.push({ event, layer: layerOrFn, fn: fn as Handler })
    return this
  }
  once(event: string, fn: Handler) {
    const wrapper: Handler = (payload) => {
      this.off(event, wrapper)
      fn(payload)
    }
    return this.on(event, wrapper)
  }
  off(event: string, fn: Handler) {
    this.handlers = this.handlers.filter((h) => !(h.event === event && h.fn === fn))
    return this
  }
  /** Calls the handlers for an event, for example a mouse move over one of the field layers. */
  fire(event: string, layer: string | undefined, payload: unknown = {}) {
    for (const h of [...this.handlers]) if (h.event === event && h.layer === layer) h.fn(payload)
  }
  getZoom() {
    return this.zoom
  }
  getSource(id: string) {
    if (id === 'fields') return this.fieldsSource
    return this.sources[id]
  }
  getCanvas() {
    return this.canvas
  }
  getCenter() {
    return { lng: 10, lat: 64 }
  }
  project([lon, lat]: [number, number]) {
    return { x: lon * 10, y: 800 - lat * 10 }
  }
}

export class Popup {
  static last: Popup | null = null
  text = ''
  added = false
  constructor() {
    Popup.last = this
  }
  setLngLat() {
    return this
  }
  setText(text: string) {
    this.text = text
    return this
  }
  addTo() {
    this.added = true
    return this
  }
  remove() {
    this.added = false
    return this
  }
}

export class ScaleControl {
  constructor(public options: unknown) {}
}

export class AttributionControl {
  constructor(public options: { customAttribution?: string }) {}
}

export const setWorkerUrl = vi.fn()
