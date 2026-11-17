import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

function mockFetch(response: Response | Error) {
  const fetchMock = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('App health check', () => {
  it('calls /api/health with a relative path, so the Vite proxy and production both work', () => {
    const fetchMock = mockFetch(json({ status: 'ok' }))
    render(<App />)
    expect(fetchMock).toHaveBeenCalledWith('/api/health')
  })

  it('shows Connecting before the API answers', () => {
    mockFetch(json({ status: 'ok' }))
    render(<App />)
    expect(screen.getByRole('heading')).toHaveTextContent('Status: Connecting...')
  })

  it('shows Ok when the API answers {"status": "ok"}', async () => {
    mockFetch(json({ status: 'ok' }))
    render(<App />)
    expect(await screen.findByText('Status: Ok')).toBeInTheDocument()
  })

  it('shows Error when the API answers with another status', async () => {
    mockFetch(json({ status: 'starting' }))
    render(<App />)
    expect(await screen.findByText('Status: Error')).toBeInTheDocument()
  })

  it('shows Disconnected when the API answers with an HTTP error', async () => {
    mockFetch(json({ detail: 'Not Found' }, 404))
    render(<App />)
    expect(await screen.findByText('Status: Disconnected')).toBeInTheDocument()
  })

  it('shows Disconnected when the backend cannot be reached', async () => {
    mockFetch(new TypeError('Failed to fetch'))
    render(<App />)
    expect(await screen.findByText('Status: Disconnected')).toBeInTheDocument()
  })
})
