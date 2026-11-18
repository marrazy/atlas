import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DATA_CREDIT, SOURCE_CODE_URL } from '@/config'
import { fields, snapshot, volve, volveProduction } from '@/test/fixtures'
import { json, mockApi } from '@/test/mock-api'
import { renderApp as renderAt, setWindowWidth as setWidth } from '@/test/render-app'

const nav = () => screen.getByRole('navigation', { name: 'Main' })
const breadcrumb = () => screen.getByRole('navigation', { name: 'breadcrumb' })

beforeEach(() => {
  setWidth(1280)
  mockApi({
    '/api/snapshot': snapshot,
    '/api/fields': fields,
    '/api/fields/3420717': volve,
    '/api/fields/3420717/production': volveProduction,
  })
})

describe('routes', () => {
  it.each([
    ['/', 'Shelf map', 'Shelf map'],
    ['/lifecycles', 'Field lifecycles', 'Field lifecycles'],
    ['/fields/3420717', 'Field deep dive', 'Volve'],
  ])('%s shows the %s screen, marks it in the sidebar and the breadcrumb, and sets the tab title', async (path, name, heading) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(within(nav()).getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
    expect(within(breadcrumb()).getByText(name)).toHaveAttribute('aria-current', 'page')
    await waitFor(() => expect(document.title).toBe(`${heading} · North Sea Field Atlas`))
  })

  it('marks only one sidebar link as the current page', () => {
    renderAt('/lifecycles')
    const current = within(nav())
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current.map((link) => link.textContent)).toEqual(['Field lifecycles'])
  })

  it('opens Volve when the field deep dive has no field in the address', async () => {
    renderAt('/fields')
    expect(screen.getByTestId('path')).toHaveTextContent('/fields/3420717')
    expect(await screen.findByRole('heading', { level: 1, name: 'Volve' })).toBeInTheDocument()
  })

  it('keeps the field deep dive marked in the sidebar for any field', () => {
    renderAt('/fields/46437')
    expect(within(nav()).getByRole('link', { name: 'Field deep dive' })).toHaveAttribute('aria-current', 'page')
  })

  it('says the field was not found when the id is not a number', async () => {
    renderAt('/fields/volve')
    expect(await screen.findByRole('heading', { level: 1, name: 'Field not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the field deep dive' })).toHaveAttribute('href', '/fields')
  })

  it('shows a not found page for an unknown address, with a way back', async () => {
    renderAt('/wells')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(within(breadcrumb()).getByText('Page not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the shelf map' })).toHaveAttribute('href', '/')
  })

  it('moves between screens with the sidebar links', async () => {
    renderAt('/')
    fireEvent.click(within(nav()).getByRole('link', { name: 'Field lifecycles' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/lifecycles')
    expect(await screen.findByRole('heading', { level: 1, name: 'Field lifecycles' })).toBeInTheDocument()
  })
})

describe('header', () => {
  it('shows the snapshot month from /api/snapshot', async () => {
    renderAt('/')
    expect(await screen.findByText('Snapshot · Aug 2026')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/snapshot', expect.anything())
  })

  it('still shows the badge, without a date, when the snapshot cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    renderAt('/')
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.getByText('Snapshot')).toBeInTheDocument()
    expect(screen.queryByText(/Snapshot ·/)).not.toBeInTheDocument()
  })

  it('loads the snapshot again on the next screen when it failed, and then shows the date', async () => {
    let calls = 0
    mockApi({
      '/api/snapshot': () => Promise.resolve(++calls === 1 ? json({}, 503) : json(snapshot)),
    })
    renderAt('/')
    await waitFor(() => expect(calls).toBe(1))
    expect(await screen.findByText('Snapshot')).toBeInTheDocument()

    fireEvent.click(within(nav()).getByRole('link', { name: 'Field lifecycles' }))
    expect(await screen.findByText('Snapshot · Aug 2026')).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('links the breadcrumb home and the source code to GitHub', () => {
    renderAt('/lifecycles')
    expect(within(breadcrumb()).getByRole('link', { name: 'Atlas' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Source code' })).toHaveAttribute('href', SOURCE_CODE_URL)
  })
})

describe('data credit', () => {
  it('is the same text the API gives as attribution', () => {
    expect(DATA_CREDIT).toBe(snapshot.attribution)
  })

  it.each(['/', '/fields/3420717', '/lifecycles', '/wells'])('is on the %s screen', (path) => {
    renderAt(path)
    expect(screen.getAllByText(DATA_CREDIT, { exact: false }).length).toBeGreaterThan(0)
  })

  it('names the last month of production in the sidebar', async () => {
    renderAt('/')
    expect(await screen.findByText(/Production up to August 2026\./)).toBeInTheDocument()
  })

  it('is still on the page on a phone, where the sidebar is closed', () => {
    setWidth(390)
    renderAt('/')
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toHaveTextContent(DATA_CREDIT)
  })
})

describe('phone menu', () => {
  it('opens the sidebar from the menu button and closes it after choosing a screen', async () => {
    setWidth(390)
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))
    const link = await within(await screen.findByRole('dialog')).findByRole('link', { name: 'Field lifecycles' })
    fireEvent.click(link)
    expect(screen.getByTestId('path')).toHaveTextContent('/lifecycles')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('keyboard', () => {
  it('has a skip link to the main content', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })
})
