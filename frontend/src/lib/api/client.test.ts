import { describe, expect, it, vi } from 'vitest'
import * as fx from '@/test/fixtures'
import {
  fitDecline,
  getField,
  getFieldInvestments,
  getFieldOutlines,
  getFieldProduction,
  getFields,
  getLifecycles,
  getShelf,
  getSnapshot,
  REQUEST_TIMEOUT_MS,
} from './client'
import { ApiError, NETWORK_MESSAGE, TIMEOUT_MESSAGE, UNAVAILABLE_MESSAGE, UNREADABLE_MESSAGE } from './errors'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function mockFetch(...responses: (Response | Error | DOMException)[]) {
  const fetchMock = vi.fn<typeof fetch>()
  for (const r of responses) {
    if (r instanceof Response) fetchMock.mockResolvedValueOnce(r)
    else fetchMock.mockRejectedValueOnce(r)
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function calledUrl(fetchMock: ReturnType<typeof mockFetch>) {
  return fetchMock.mock.calls[0][0]
}

describe('GET routes', () => {
  it.each([
    ['getSnapshot', '/api/snapshot', () => getSnapshot(), fx.snapshot],
    ['getFields', '/api/fields', () => getFields(), fx.fields],
    ['getFieldOutlines', '/api/fields/outlines', () => getFieldOutlines(), fx.volveOutline],
    ['getField', '/api/fields/3420717', () => getField(fx.VOLVE_ID), fx.volve],
    ['getFieldProduction', '/api/fields/3420717/production', () => getFieldProduction(fx.VOLVE_ID), fx.volveProduction],
    ['getFieldInvestments', '/api/fields/3420717/investments', () => getFieldInvestments(fx.VOLVE_ID), fx.volveInvestments],
    ['getShelf', '/api/shelf', () => getShelf(), fx.shelf],
    ['getLifecycles', '/api/lifecycles', () => getLifecycles(), fx.lifecycles],
  ])('%s calls %s and returns the data as sent', async (_name, url, call, data) => {
    const fetchMock = mockFetch(json(data))
    await expect(call()).resolves.toEqual(data)
    expect(calledUrl(fetchMock)).toBe(url)
    expect(fetchMock.mock.calls[0][1]?.method ?? 'GET').toBe('GET')
  })

  it('keeps empty values as null, so screens can skip them (Sindre has no location)', async () => {
    mockFetch(json(fx.fields))
    const sindre = (await getFields()).find((f) => f.name === 'Sindre')
    expect(sindre?.lon).toBeNull()
    expect(sindre?.lat).toBeNull()
  })
})

describe('getLifecycles query', () => {
  it('sends min_cum and repeats include once for each field', async () => {
    const fetchMock = mockFetch(json(fx.lifecycles))
    await getLifecycles({ minCum: 0, include: [3420717, 43520] })
    expect(calledUrl(fetchMock)).toBe('/api/lifecycles?min_cum=0&include=3420717&include=43520')
  })

  it('sends only include when min_cum is left out', async () => {
    const fetchMock = mockFetch(json(fx.lifecycles))
    await getLifecycles({ include: [3420717] })
    expect(calledUrl(fetchMock)).toBe('/api/lifecycles?include=3420717')
  })
})

describe('fitDecline', () => {
  it('posts the request as JSON to /api/decline-fit', async () => {
    const fetchMock = mockFetch(json(fx.volveDeclineHyperbolic))
    const request = { field_id: fx.VOLVE_ID, start: '2015-04', end: '2016-08', model: 'hyperbolic' as const }

    await expect(fitDecline(request)).resolves.toEqual(fx.volveDeclineHyperbolic)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/decline-fit')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(init?.body))).toEqual(request)
  })
})

describe('errors', () => {
  it('throws an ApiError with the status and a readable message for plain text detail', async () => {
    mockFetch(json(fx.apiErrors.fieldNotFound.body, 404))
    const error = await getField(1).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, message: 'No field with id 1.' })
  })

  it('throws an ApiError with a readable message for a list of rejected inputs', async () => {
    mockFetch(json(fx.apiErrors.windowBackwards.body, 422))
    await expect(fitDecline({ field_id: fx.VOLVE_ID, start: '2016-08', end: '2015-04' })).rejects.toMatchObject({
      status: 422,
      message: 'End must be after start.',
    })
  })

  it('handles an error page that is not JSON, for example from Cloudflare', async () => {
    mockFetch(new Response('<html>Bad gateway</html>', { status: 502 }))
    await expect(getShelf()).rejects.toMatchObject({ status: 502, message: UNAVAILABLE_MESSAGE })
  })

  it('gives a connection message when the server cannot be reached', async () => {
    mockFetch(new TypeError('Failed to fetch'))
    await expect(getShelf()).rejects.toMatchObject({ status: 0, message: NETWORK_MESSAGE })
  })

  it('throws when a successful answer is not JSON', async () => {
    mockFetch(new Response('<!doctype html><html></html>', { status: 200 }))
    await expect(getShelf()).rejects.toMatchObject({ status: 200, message: UNREADABLE_MESSAGE })
  })
})

describe('cancelling', () => {
  it('stops the request when the caller cancels it while it runs', async () => {
    let sent: AbortSignal | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        sent = init?.signal ?? undefined
        return new Promise<Response>(() => {})
      }),
    )
    const controller = new AbortController()
    void getField(fx.VOLVE_ID, { signal: controller.signal })
    expect(sent?.aborted).toBe(false)
    controller.abort()
    expect(sent?.aborted).toBe(true)
  })

  it('sends an already stopped signal when the caller cancelled before the request', async () => {
    const fetchMock = mockFetch(json(fx.volve))
    const controller = new AbortController()
    controller.abort()
    await getField(fx.VOLVE_ID, { signal: controller.signal })
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
  })

  it('lets a cancelled request fail as AbortError, not as a connection problem', async () => {
    mockFetch(new DOMException('The operation was aborted.', 'AbortError'))
    const error = await getField(fx.VOLVE_ID).catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ name: 'AbortError' })
  })
})

describe('time limit', () => {
  /** A fetch that never answers until its signal is stopped, like a server that hangs. */
  function hangingFetch() {
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')))
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('gives up after the time limit with a message that says so', async () => {
    vi.useFakeTimers()
    try {
      hangingFetch()
      const result = getShelf().catch((e: unknown) => e)
      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
      expect(await result).toMatchObject({ status: 0, message: TIMEOUT_MESSAGE })
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps waiting until the time limit', async () => {
    vi.useFakeTimers()
    try {
      const fetchMock = hangingFetch()
      void getShelf().catch(() => undefined)
      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1)
      expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('is still a cancel, not a time out, when the caller stops the request', async () => {
    hangingFetch()
    const controller = new AbortController()
    const result = getShelf({ signal: controller.signal }).catch((e: unknown) => e)
    controller.abort()
    const error = await result
    expect(error).not.toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ name: 'AbortError' })
  })
})
