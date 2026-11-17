import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { fields } from '@/test/fixtures'
import { AttributionControl, Map, Popup, setWorkerUrl } from '@/test/maplibre-stub'
import ShelfMap from './ShelfMap'

function renderMap() {
  const onSelectField = vi.fn()
  const view = render(<ShelfMap fields={fields} onSelectField={onSelectField} />)
  return { map: Map.last!, onSelectField, ...view }
}

describe('ShelfMap', () => {
  it('points MapLibre at the worker file that Vite copies into the build, before the map starts', () => {
    renderMap()
    expect(setWorkerUrl).toHaveBeenCalledWith(expect.stringContaining('maplibre-gl-worker'))
  })

  it('starts on all mapped fields, without rotation, and only zooms with Ctrl or two fingers', () => {
    const { map } = renderMap()
    expect(map.options.bounds).toEqual([1.886, 58.4385, 6.3668, 65.1792])
    expect(map.options.dragRotate).toBe(false)
    expect(map.options.cooperativeGestures).toBe(true)
    expect(map.touchZoomRotate.disableRotation).toHaveBeenCalled()
  })

  it('credits Sodir and Natural Earth on the map', () => {
    const { map } = renderMap()
    const credit = map.controls.find((c) => c instanceof AttributionControl) as AttributionControl
    expect(credit.options.customAttribution).toBe('MapLibre · Fields © Sodir (NLOD) · Coastline: Natural Earth')
  })

  it('describes the map to screen readers', () => {
    const { map } = renderMap()
    expect(map.canvas.getAttribute('aria-label')).toMatch(/^Map of the Norwegian Continental Shelf with 2 fields/)
  })

  it('shows the field text when the pointer is over a circle, and hides it when it leaves', () => {
    const { map } = renderMap()
    const props = { field_id: 3420717, hover: 'Volve · oil · first production 2008' }
    map.fire('mousemove', 'fields-shut-down', { features: [{ properties: props }], lngLat: { lng: 1.9, lat: 58.4 } })
    expect(Popup.last!.text).toBe('Volve · oil · first production 2008')
    expect(Popup.last!.added).toBe(true)
    map.fire('mouseleave', 'fields-shut-down')
    expect(Popup.last!.added).toBe(false)
  })

  it('opens the field when its circle is clicked', () => {
    const { map, onSelectField } = renderMap()
    map.fire('click', 'fields-producing', { features: [{ properties: { field_id: 46437 } }] })
    expect(onSelectField).toHaveBeenCalledWith(46437)
  })

  it('has real buttons to zoom and to show the whole shelf again', () => {
    const { map } = renderMap()
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show the whole shelf' }))
    expect(map.zoomIn).toHaveBeenCalled()
    expect(map.zoomOut).toHaveBeenCalled()
    expect(map.fitBounds).toHaveBeenCalledWith([1.886, 58.4385, 6.3668, 65.1792], expect.objectContaining({ padding: 32 }))
  })

  it('fits all fields again once the map has loaded, in case the card changed size', () => {
    const { map } = renderMap()
    map.fire('load', undefined)
    expect(map.resize).toHaveBeenCalled()
    expect(map.fitBounds).toHaveBeenCalledWith([1.886, 58.4385, 6.3668, 65.1792], { padding: 32, animate: false })
  })

  it('removes the map when the page closes', () => {
    const { map, unmount } = renderMap()
    unmount()
    expect(map.remove).toHaveBeenCalled()
  })
})
