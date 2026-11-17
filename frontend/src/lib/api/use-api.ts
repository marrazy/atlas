import { useEffect, useEffectEvent, useState } from 'react'
import { describeError } from './errors'

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

const LOADING: ApiState<never> = { status: 'loading' }

/**
 * Loads data for a screen. It loads again when `key` changes (for example a new field id),
 * cancels the old request, and never lets an old answer replace a newer one.
 */
export function useApi<T>(key: string, load: (signal: AbortSignal) => Promise<T>): ApiState<T> {
  const [result, setResult] = useState<{ key: string; state: ApiState<T> } | null>(null)
  const start = useEffectEvent(load)

  useEffect(() => {
    const controller = new AbortController()
    let current = true

    start(controller.signal).then(
      (data) => {
        if (current) setResult({ key, state: { status: 'ready', data } })
      },
      (error: unknown) => {
        const message = describeError(error)
        if (current && message !== null) setResult({ key, state: { status: 'error', message } })
      },
    )

    return () => {
      current = false
      controller.abort()
    }
  }, [key])

  return result?.key === key ? result.state : LOADING
}
