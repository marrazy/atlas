import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/App'
import { DATA_CREDIT, SOURCE_CODE_URL } from '@/config'
import { snapshot } from '@/test/fixtures'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function CurrentPath() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <CurrentPath />
    </MemoryRouter>,
  )
}

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
}

const nav = () => screen.getByRole('navigation', { name: 'Main' })
const breadcrumb = () => screen.getByRole('navigation', { name: 'breadcrumb' })

beforeEach(() => {
  setWidth(1280)
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(json(snapshot))))
})

describe('routes', () => {
  it.each([
    ['/', 'Shelf map'],
    ['/lifecycles', 'Field lifecycles'],
    ['/fields/3420717', 'Field deep dive'],
  ])('%s shows the %s screen, marks it in the sidebar and the breadcrumb, and sets the tab title', async (path, name) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument()
    expect(within(nav()).getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
    expect(within(breadcrumb()).getByText(name)).toHaveAttribute('aria-current', 'page')
    await waitFor(() => expect(document.title).toBe(`${name} · North Sea Field Atlas`))
  })

  it('marks only one sidebar link as the current page', () => {
    renderAt('/lifecycles')
    const current = within(nav())
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current.map((link) => link.textContent)).toEqual(['Field lifecycles'])
  })

  it('opens Volve when the field deep dive has no field in the address', () => {
    renderAt('/fields')
    expect(screen.getByTestId('path')).toHaveTextContent('/fields/3420717')
    expect(screen.getByRole('heading', { level: 1, name: 'Field deep dive' })).toBeInTheDocument()
  })

  it('keeps the field deep dive marked in the sidebar for any field', () => {
    renderAt('/fields/46437')
    expect(within(nav()).getByRole('link', { name: 'Field deep dive' })).toHaveAttribute('aria-current', 'page')
  })

  it('says the field was not found when the id is not a number', () => {
    renderAt('/fields/volve')
    expect(screen.getByRole('heading', { level: 1, name: 'Field not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the field deep dive' })).toHaveAttribute('href', '/fields')
  })

  it('shows a not found page for an unknown address, with a way back', () => {
    renderAt('/wells')
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(within(breadcrumb()).getByText('Page not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the shelf map' })).toHaveAttribute('href', '/')
  })

  it('moves between screens with the sidebar links', () => {
    renderAt('/')
    fireEvent.click(within(nav()).getByRole('link', { name: 'Field lifecycles' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/lifecycles')
    expect(screen.getByRole('heading', { level: 1, name: 'Field lifecycles' })).toBeInTheDocument()
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
