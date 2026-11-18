import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NORTH_SEA_VIEW, OUTLINE_ZOOM, fieldTooltipLines, fieldPoints } from '@/lib/map/shelf-map'
import { fields, volveOutline } from '@/test/fixtures'
import { json, mockApi } from '@/test/mock-api'
import { Map, Popup, setWorkerUrl } from '@/test/maplibre-stub'
import ShelfMap from './ShelfMap'

function renderMap(year = 2012) {
  const onSelectField = vi.fn()
  const view = render(<ShelfMap fields={fields} year={year} onSelectField={onSelectField} />)
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

  it('has no attribution box or compass on the map, as design v2 asks; the page credits the data', () => {
    const { map } = renderMap()
    expect(map.controls).toEqual([])
    expect(screen.queryByRole('button', { name: /compass/i })).not.toBeInTheDocument()
  })

  it('names the view and shows a scale bar, as small white labels', () => {
    renderMap()
    expect(screen.getAllByText('Whole shelf').length).toBeGreaterThan(0)
    expect(screen.getByText(/^\d+ km$/)).toBeInTheDocument()
  })

  it('writes place names in sentence case, with no uppercase or wide letter spacing', () => {
    renderMap()
    const label = screen.getByText('North Sea')
    expect(label.className).not.toMatch(/uppercase|tracking/)
  })

  it('describes the map to screen readers, for the chosen year', () => {
    const { map } = renderMap()
    expect(map.canvas.getAttribute('aria-label')).toMatch(/^Map of the Norwegian Continental Shelf in 2012, with 2 fields/)
  })

  it('starts with the circles for the chosen year', () => {
    const { map } = renderMap(2020)
    const data = (map.options.style as { sources: { fields: { data: ReturnType<typeof fieldPoints> } } }).sources.fields.data
    expect(data).toEqual(fieldPoints(fields, 2020))
  })

  it('changes the circles and the description when the year changes, without making a new map', () => {
    const { map, rerender } = renderMap(2012)
    rerender(<ShelfMap fields={fields} year={2020} onSelectField={vi.fn()} />)
    expect(Map.last).toBe(map)
    expect(map.fieldsSource.setData).toHaveBeenLastCalledWith(fieldPoints(fields, 2020))
    expect(map.canvas.getAttribute('aria-label')).toMatch(/in 2020, .* 0 produced that year, 1 had stopped/)
  })

  it('shows the field text when the pointer is over a circle, and hides it when it leaves', () => {
    const { map } = renderMap()
    map.fire('mousemove', 'fields-stopped', { features: [{ properties: { field_id: 3420717 } }], lngLat: { lng: 1.9, lat: 58.4 } })
    expect(Popup.last!.text.split('\n')).toEqual([
      'Volve',
      '58°26′N 001°53′E',
      'Oil',
      'First production 2008',
      'Shut down after 2016',
      '11.4 million Sm³ o.e. produced',
    ])
    expect(Popup.last!.added).toBe(true)
    map.fire('mouseleave', 'fields-stopped')
    expect(Popup.last!.added).toBe(false)
  })

  it('opens the field when its circle is clicked', () => {
    const { map, onSelectField } = renderMap()
    map.fire('click', 'fields-producing', { features: [{ properties: { field_id: 46437 } }] })
    expect(onSelectField).toHaveBeenCalledWith(46437)
  })

  it('has two real buttons, one to zoom in to the North Sea and one to go back to the whole shelf', () => {
    const { map } = renderMap()
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Zoom in to the northern North Sea',
      'Zoom out to the whole shelf',
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out to the whole shelf' }))
    expect(map.fitBounds).toHaveBeenCalledWith([1.886, 58.4385, 6.3668, 65.1792], expect.objectContaining({ padding: 24 }))
  })

  it('keeps the view the visitor chose if they used a button before the map finished starting', () => {
    const { map } = renderMap()
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in to the northern North Sea' }))
    map.fire('load', undefined)
    expect(map.fitBounds).not.toHaveBeenCalled()
  })

  it('fits all fields again once the map has loaded, in case the card changed size', () => {
    const { map } = renderMap()
    map.fire('load', undefined)
    expect(map.resize).toHaveBeenCalled()
    expect(map.fitBounds).toHaveBeenCalledWith([1.886, 58.4385, 6.3668, 65.1792], { padding: 24, animate: false })
  })

  it('removes the map when the page closes', () => {
    const { map, unmount } = renderMap()
    unmount()
    expect(map.remove).toHaveBeenCalled()
  })
})

describe('ShelfMap field outlines', () => {
  /** Starts the map with the outline route answering, zoomed to `zoom`, and fires the load event. */
  function loadedMap(zoom = 3, year = 2012) {
    const fetchMock = mockApi({ '/api/fields/outlines': volveOutline })
    const view = renderMap(year)
    view.map.zoom = zoom
    view.map.fire('load', undefined)
    return { ...view, fetchMock }
  }
  const outlineCalls = (fetchMock: ReturnType<typeof mockApi>) =>
    fetchMock.mock.calls.filter(([url]) => String(url) === '/api/fields/outlines').length

  it('does not download the outlines while the whole shelf is shown', () => {
    const { fetchMock } = loadedMap(3)
    expect(outlineCalls(fetchMock)).toBe(0)
  })

  it('downloads them once the visitor zooms in, and only once', async () => {
    const { map, fetchMock } = loadedMap(3)
    map.zoom = OUTLINE_ZOOM.load
    map.fire('zoomend', undefined)
    map.fire('zoomend', undefined)
    await waitFor(() => expect(map.addSource).toHaveBeenCalled())
    expect(outlineCalls(fetchMock)).toBe(1)
    expect(map.addSource).toHaveBeenCalledWith('outlines', { type: 'geojson', data: volveOutline, promoteId: 'field_id' })
  })

  it('draws the outlines under the circles', async () => {
    const { map } = loadedMap(5)
    await waitFor(() => expect(map.addLayer).toHaveBeenCalledTimes(2))
    expect(map.addLayer.mock.calls.map(([layer, before]) => [layer.id, before])).toEqual([
      ['outlines-fill', 'fields-halo'],
      ['outlines-line', 'fields-halo'],
    ])
  })

  it('gives each outline its kind for the year, and changes it with the year', async () => {
    const { map, rerender } = loadedMap(5, 2012)
    await waitFor(() => expect(map.setFeatureState).toHaveBeenCalledWith({ source: 'outlines', id: 3420717 }, { kind: 'producing' }))
    rerender(<ShelfMap fields={fields} year={2020} onSelectField={vi.fn()} />)
    expect(map.setFeatureState).toHaveBeenLastCalledWith({ source: 'outlines', id: 42002473 }, { kind: 'not-yet' })
    expect(map.setFeatureState).toHaveBeenCalledWith({ source: 'outlines', id: 3420717 }, { kind: 'stopped' })
  })

  it('fades the circles only after MapLibre has the outlines ready, so the map is never empty', async () => {
    const { map } = loadedMap(5)
    await waitFor(() => expect(map.addSource).toHaveBeenCalled())
    map.fire('sourcedata', undefined, { sourceId: 'outlines', isSourceLoaded: false })
    expect(map.setLayerZoomRange).not.toHaveBeenCalled()
    map.fire('sourcedata', undefined, { sourceId: 'outlines', isSourceLoaded: true })
    for (const layer of ['fields-producing', 'fields-stopped', 'fields-not-yet']) {
      expect(map.setLayerZoomRange).toHaveBeenCalledWith(layer, 0, OUTLINE_ZOOM.end)
    }
    expect(map.setPaintProperty).toHaveBeenCalledWith('fields-producing', 'circle-opacity', expect.arrayContaining(['interpolate']))
  })

  it('shows the field text on hover and opens the field on click, like the circles', async () => {
    const { map, onSelectField } = loadedMap(5)
    await waitFor(() => expect(map.addLayer).toHaveBeenCalledTimes(2))
    map.fire('mousemove', 'outlines-fill', { features: [{ properties: { field_id: 3420717 } }], lngLat: { lng: 1.9, lat: 58.4 } })
    expect(Popup.last!.text.split('\n')).toEqual(fieldTooltipLines(fields[0]))
    map.fire('click', 'outlines-fill', { features: [{ properties: { field_id: 3420717 } }] })
    expect(onSelectField).toHaveBeenCalledWith(3420717)
  })

  it('keeps the circles and says so when the outlines cannot load, with a way to try again', async () => {
    const fetchMock = mockApi({ '/api/fields/outlines': json({ detail: 'Internal Server Error' }, 500) })
    const { map } = renderMap()
    map.zoom = 5
    map.fire('load', undefined)
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Could not load the field outlines, so the map keeps the circles\./)
    expect(map.setLayerZoomRange).not.toHaveBeenCalled()

    mockApi({ '/api/fields/outlines': volveOutline })
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(map.addSource).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('has a button that goes to the northern North Sea, far enough in for the outlines', async () => {
    const { map, fetchMock } = loadedMap(3)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in to the northern North Sea' }))
    expect(map.cameraForBounds).toHaveBeenCalledWith(NORTH_SEA_VIEW, { padding: 24 })
    // the stand-in camera is zoom 4.2, which is too far out, so it goes to the outline zoom instead
    expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: OUTLINE_ZOOM.end, center: { lng: 3, lat: 59.9 } }))
    // and starts the download at once, without waiting for the zoom to finish
    expect(outlineCalls(fetchMock)).toBe(1)
    await waitFor(() => expect(map.addSource).toHaveBeenCalled())
  })
})

