import { ApiError, NETWORK_MESSAGE, TIMEOUT_MESSAGE, UNREADABLE_MESSAGE, errorMessage, isAbortError } from './errors'
import type {
  DeclineRequest,
  DeclineResult,
  FieldDetail,
  FieldOutlines,
  FieldSummary,
  InvestmentYear,
  LifecycleSet,
  ProductionMonth,
  ShelfSummary,
  Snapshot,
} from './types'

export type RequestOptions = { signal?: AbortSignal }

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return undefined
  }
}

/**
 * How long to wait for an answer before giving up, so a screen never shows its loading placeholders forever.
 * It is long, because a sleeping server can take a while to wake up.
 */
export const REQUEST_TIMEOUT_MS = 30_000

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // one signal that stops the request when the caller cancels it or when the time runs out
  const controller = new AbortController()
  const outer = init.signal
  const cancel = () => controller.abort()
  if (outer?.aborted) cancel()
  outer?.addEventListener('abort', cancel)
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    let res: Response
    try {
      res = await fetch(`/api${path}`, { ...init, signal: controller.signal })
    } catch (error) {
      if (timedOut) throw new ApiError(0, TIMEOUT_MESSAGE)
      if (isAbortError(error)) throw error
      throw new ApiError(0, NETWORK_MESSAGE)
    }

    const body = await readJson(res)
    if (timedOut) throw new ApiError(0, TIMEOUT_MESSAGE)
    if (!res.ok) throw new ApiError(res.status, errorMessage(res.status, body))
    if (body === undefined) throw new ApiError(res.status, UNREADABLE_MESSAGE)
    return body as T
  } finally {
    clearTimeout(timer)
    outer?.removeEventListener('abort', cancel)
  }
}

export function getSnapshot({ signal }: RequestOptions = {}) {
  return request<Snapshot>('/snapshot', { signal })
}

export function getFields({ signal }: RequestOptions = {}) {
  return request<FieldSummary[]>('/fields', { signal })
}

export function getFieldOutlines({ signal }: RequestOptions = {}) {
  return request<FieldOutlines>('/fields/outlines', { signal })
}

export function getField(fieldId: number, { signal }: RequestOptions = {}) {
  return request<FieldDetail>(`/fields/${fieldId}`, { signal })
}

export function getFieldProduction(fieldId: number, { signal }: RequestOptions = {}) {
  return request<ProductionMonth[]>(`/fields/${fieldId}/production`, { signal })
}

export function getFieldInvestments(fieldId: number, { signal }: RequestOptions = {}) {
  return request<InvestmentYear[]>(`/fields/${fieldId}/investments`, { signal })
}

export function getShelf({ signal }: RequestOptions = {}) {
  return request<ShelfSummary>('/shelf', { signal })
}

export type LifecycleOptions = RequestOptions & {
  /** Only fields that produced at least this much, million Sm³ o.e. The API uses 8 when left out. */
  minCum?: number
  /** Field ids to show even if they produced less than minCum. */
  include?: number[]
}

export function getLifecycles({ minCum, include = [], signal }: LifecycleOptions = {}) {
  const params = new URLSearchParams()
  if (minCum !== undefined) params.set('min_cum', String(minCum))
  for (const id of include) params.append('include', String(id))
  const query = params.size ? `?${params}` : ''
  return request<LifecycleSet>(`/lifecycles${query}`, { signal })
}

export function fitDecline(body: DeclineRequest, { signal }: RequestOptions = {}) {
  return request<DeclineResult>('/decline-fit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}
