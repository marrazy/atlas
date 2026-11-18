import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, NETWORK_MESSAGE, UNKNOWN_MESSAGE } from './errors'
import { useApi } from './use-api'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useApi', () => {
  it('is loading first, then ready with the data', async () => {
    const { result } = renderHook(() => useApi('a', () => Promise.resolve(42)))
    expect(result.current).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', data: 42 }))
  })

  it('gives the readable message when the API answers with an error', async () => {
    const { result } = renderHook(() => useApi('a', () => Promise.reject(new ApiError(404, 'No field with id 1.'))))
    await waitFor(() =>
      expect(result.current).toEqual({ status: 'error', message: 'No field with id 1.', httpStatus: 404 }),
    )
  })

  it('gives a general message for an error that did not come from the API', async () => {
    const { result } = renderHook(() => useApi('a', () => Promise.reject(new TypeError('boom'))))
    await waitFor(() =>
      expect(result.current).toEqual({ status: 'error', message: UNKNOWN_MESSAGE, retry: expect.any(Function) }),
    )
  })

  it('loads again and cancels the old request when the key changes', async () => {
    const signals: AbortSignal[] = []
    const load = vi.fn((signal: AbortSignal) => {
      signals.push(signal)
      return new Promise<string>(() => {})
    })
    const { rerender } = renderHook(({ id }) => useApi(`field:${id}`, load), { initialProps: { id: 1 } })
    rerender({ id: 2 })
    expect(load).toHaveBeenCalledTimes(2)
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
  })

  it('never shows an old answer that arrives after a newer request started', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const answers = [first, second]
    let call = 0
    const { result, rerender } = renderHook(({ id }) => useApi(`field:${id}`, () => answers[call++].promise), {
      initialProps: { id: 1 },
    })
    rerender({ id: 2 })

    await act(async () => second.resolve('Troll'))
    await act(async () => first.resolve('Volve'))

    expect(result.current).toEqual({ status: 'ready', data: 'Troll' })
  })

  it('shows loading again, not the old field, while the new key loads', async () => {
    const { result, rerender } = renderHook(
      ({ id }) => useApi(`field:${id}`, () => (id === 1 ? Promise.resolve('Volve') : new Promise<string>(() => {}))),
      { initialProps: { id: 1 } },
    )
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', data: 'Volve' }))
    rerender({ id: 2 })
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('cancels the request when the screen closes', () => {
    let seen: AbortSignal | undefined
    const { unmount } = renderHook(() =>
      useApi('a', (signal) => {
        seen = signal
        return new Promise(() => {})
      }),
    )
    unmount()
    expect(seen?.aborted).toBe(true)
  })

  describe('trying again', () => {
    it('offers a retry when the server was not reached, or had a fault', async () => {
      const network = renderHook(() => useApi('a', () => Promise.reject(new ApiError(0, NETWORK_MESSAGE))))
      const fault = renderHook(() => useApi('b', () => Promise.reject(new ApiError(503, 'Service unavailable.'))))
      await waitFor(() => expect(network.result.current).toMatchObject({ status: 'error', retry: expect.any(Function) }))
      await waitFor(() =>
        expect(fault.result.current).toMatchObject({ status: 'error', httpStatus: 503, retry: expect.any(Function) }),
      )
    })

    it('offers no retry when the server said the request itself is wrong, since the same request would fail again', async () => {
      const missing = renderHook(() => useApi('a', () => Promise.reject(new ApiError(404, 'No field with id 1.'))))
      const unfit = renderHook(() => useApi('b', () => Promise.reject(new ApiError(422, 'Too few months to fit.'))))
      await waitFor(() => expect(missing.result.current.status).toBe('error'))
      await waitFor(() => expect(unfit.result.current.status).toBe('error'))
      expect(missing.result.current).not.toHaveProperty('retry')
      expect(unfit.result.current).not.toHaveProperty('retry')
    })

    it('loads the same data again, showing loading in between, and shows it when it arrives', async () => {
      const second = deferred<string>()
      const load = vi
        .fn<(signal: AbortSignal) => Promise<string>>()
        .mockRejectedValueOnce(new ApiError(0, NETWORK_MESSAGE))
        .mockReturnValueOnce(second.promise)
      const { result } = renderHook(() => useApi('a', load))
      await waitFor(() => expect(result.current.status).toBe('error'))

      act(() => (result.current as { retry: () => void }).retry())
      expect(result.current).toEqual({ status: 'loading' })
      expect(load).toHaveBeenCalledTimes(2)

      await act(async () => second.resolve('Volve'))
      expect(result.current).toEqual({ status: 'ready', data: 'Volve' })
    })
  })
})
