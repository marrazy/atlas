import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { ApiError, describeError } from './errors'

export type ApiState<T> =
  | { status: 'loading' }
  /** httpStatus is set when the API answered, for example 404 for an unknown field. `retry`, when set, loads again. */
  | { status: 'error'; message: string; httpStatus?: number; retry?: () => void }
  | { status: 'ready'; data: T }

const LOADING: ApiState<never> = { status: 'loading' }

/**
 * Loads data for a screen. It loads again when `key` changes (for example a new field id),
 * cancels the old request, and never lets an old answer replace a newer one.
 * After an error that a new try could fix (no answer, a time out or a server fault), `retry` loads the same data again.
 */
export function useApi<T>(key: string, load: (signal: AbortSignal) => Promise<T>): ApiState<T> {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; attempt: number; state: ApiState<T> } | null>(null)
  const start = useEffectEvent(load)
  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    let current = true

    start(controller.signal).then(
      (data) => {
        if (current) setResult({ key, attempt, state: { status: 'ready', data } })
      },
      (error: unknown) => {
        const message = describeError(error)
        if (!current || message === null) return
        const httpStatus = error instanceof ApiError && error.status > 0 ? error.status : undefined
        // trying again can help when the server was not reached or had a fault, not when it said the request is wrong
        const canRetry = httpStatus === undefined || httpStatus >= 500
        const state: ApiState<T> = { status: 'error', message, httpStatus, ...(canRetry && { retry }) }
        setResult({ key, attempt, state })
      },
    )

    return () => {
      current = false
      controller.abort()
    }
  }, [key, attempt, retry])

  return result?.key === key && result.attempt === attempt ? result.state : LOADING
}
