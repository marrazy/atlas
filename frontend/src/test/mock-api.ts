import { vi } from 'vitest'

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

type Answer = unknown | Response | (() => Promise<Response>)

/**
 * Replaces fetch with fake answers by address, for example `{ '/api/snapshot': snapshot }`.
 * A plain value is sent as JSON with status 200. Any other address gets a 404, like the real API.
 */
export function mockApi(routes: Record<string, Answer>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (!(url in routes)) return Promise.resolve(json({ detail: 'Not Found' }, 404))
    const answer = routes[url]
    if (typeof answer === 'function') return (answer as () => Promise<Response>)()
    if (answer instanceof Response) return Promise.resolve(answer.clone())
    return Promise.resolve(json(answer))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
