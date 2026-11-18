import { fireEvent, render, screen } from '@testing-library/react'
import { lazy } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PageLoader } from './PageLoader'

const NeverLoads = lazy(() => new Promise<{ default: () => null }>(() => {}))
const FailsToLoad = lazy(() =>
  Promise.reject(new TypeError('Failed to fetch dynamically imported module: /assets/FieldPage-old.js')),
)
function Crashes(): never {
  throw new TypeError("Cannot read properties of undefined (reading 'name')")
}
const Loads = lazy(() => Promise.resolve({ default: () => <h1>Field lifecycles</h1> }))

describe('PageLoader', () => {
  it('shows a placeholder, and tells screen readers, while the screen file downloads', () => {
    render(
      <PageLoader resetKey="/fields/3420717">
        <NeverLoads />
      </PageLoader>,
    )
    expect(screen.getByText('Loading page')).toBeInTheDocument()
    expect(screen.getByText('Loading page').parentElement).toHaveAttribute('aria-busy', 'true')
  })

  it('shows the screen once its file has loaded', async () => {
    render(
      <PageLoader resetKey="/lifecycles">
        <Loads />
      </PageLoader>,
    )
    expect(await screen.findByRole('heading', { name: 'Field lifecycles' })).toBeInTheDocument()
    expect(screen.queryByText('Loading page')).not.toBeInTheDocument()
  })

  it('offers a reload instead of a blank page when the file is gone after a new release', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })

    render(
      <PageLoader resetKey="/fields/3420717">
        <FailsToLoad />
      </PageLoader>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('This page could not load.')
    fireEvent.click(screen.getByRole('button', { name: 'Reload page' }))
    expect(reload).toHaveBeenCalled()
  })

  it('gives a plain message, not the new release one, when the page breaks for another reason', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <PageLoader resetKey="/lifecycles">
        <Crashes />
      </PageLoader>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong while showing this page.')
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
  })

  it('clears the error when the visitor moves to another screen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(
      <PageLoader resetKey="/fields/3420717">
        <FailsToLoad />
      </PageLoader>,
    )
    await screen.findByRole('alert')

    rerender(
      <PageLoader resetKey="/lifecycles">
        <Loads />
      </PageLoader>,
    )
    expect(await screen.findByRole('heading', { name: 'Field lifecycles' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
