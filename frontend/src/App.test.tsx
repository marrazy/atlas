import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CREDIT_LINE, DATA_CREDIT, SOURCE_CODE_URL } from '@/config'
import { fields, snapshot, volve, volveProduction } from '@/test/fixtures'
import { json, mockApi } from '@/test/mock-api'
import { renderApp as renderAt, setWindowWidth as setWidth } from '@/test/render-app'

const nav = () => screen.getByRole('navigation', { name: 'Main' })
const breadcrumb = () => screen.getByRole('navigation', { name: 'Breadcrumb' })

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

describe('header and sidebar', () => {
  it('has no snapshot pill in the header; the sidebar footer gives the month from /api/snapshot', async () => {
    renderAt('/')
    expect(await screen.findByText('Production to Aug 2026')).toBeInTheDocument()
    expect(screen.queryByText(/Snapshot ·/)).not.toBeInTheDocument()
    expect(screen.getByText('Data snapshot')).toBeInTheDocument()
    expect(screen.getByText('Sodir FactPages, Norwegian Licence for Open Government Data')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/snapshot', expect.anything())
  })

  it('leaves the month out of the sidebar footer when the snapshot cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    renderAt('/')
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.getByText('Data snapshot')).toBeInTheDocument()
    expect(screen.queryByText(/Production to/)).not.toBeInTheDocument()
  })

  it('loads the snapshot again on the next screen when it failed, and then shows the month', async () => {
    let calls = 0
    mockApi({
      '/api/snapshot': () => Promise.resolve(++calls === 1 ? json({}, 503) : json(snapshot)),
    })
    renderAt('/')
    await waitFor(() => expect(calls).toBe(1))
    expect(screen.queryByText(/Production to/)).not.toBeInTheDocument()

    fireEvent.click(within(nav()).getByRole('link', { name: 'Field lifecycles' }))
    expect(await screen.findByText('Production to Aug 2026')).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('links the logo and the breadcrumb home, and the source code button to GitHub', () => {
    renderAt('/lifecycles')
    expect(screen.getByRole('link', { name: 'North Sea Field Atlas' })).toHaveAttribute('href', '/')
    expect(within(breadcrumb()).getByRole('link', { name: 'Atlas' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Source code' })).toHaveAttribute('href', SOURCE_CODE_URL)
  })

  it('draws the platform logo, not the old wave', () => {
    renderAt('/')
    const logo = screen.getByRole('link', { name: 'North Sea Field Atlas' }).querySelector('svg')!
    expect(logo.getAttribute('viewBox')).toBe('0 0 20 20')
    expect(logo.querySelectorAll('path')).toHaveLength(5)
    expect(logo.querySelector('circle, rect')).toBeNull()
  })

  it('lists the screens under "Explore", with the Methods page last', () => {
    renderAt('/')
    expect(within(nav()).getByText('Explore')).toBeInTheDocument()
    expect(within(nav()).getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Shelf map',
      'Field deep dive',
      'Field lifecycles',
      'Methods',
    ])
  })
})

describe('data credit', () => {
  it('is the same text the API gives as attribution, shown without the full stop at the end', () => {
    expect(DATA_CREDIT).toBe(snapshot.attribution)
    expect(CREDIT_LINE).toBe(DATA_CREDIT.slice(0, -1))
  })

  it.each(['/', '/lifecycles', '/methods', '/wells'])('is the footer line on the %s screen', async (path) => {
    renderAt(path)
    expect(await screen.findByRole('contentinfo')).toHaveTextContent(CREDIT_LINE)
  })

  it('is part of the field page note, which says where each number comes from', async () => {
    renderAt('/fields/3420717')
    await waitFor(() =>
      expect(screen.getByRole('contentinfo')).toHaveTextContent('Production and investment from the Norwegian Offshore Directorate (Sodir), NLOD.'),
    )
  })
})

describe('phone', () => {
  it('stacks the sidebar above the content, with the screens still one tap away', () => {
    setWidth(390)
    renderAt('/')
    expect(within(nav()).getByRole('link', { name: 'Field lifecycles' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Toggle Sidebar' })).not.toBeInTheDocument()
  })
})

describe('keyboard', () => {
  it('has a skip link to the main content', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })
})
