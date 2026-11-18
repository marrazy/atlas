export const NETWORK_MESSAGE = 'Could not reach the server. Check your connection and try again.'
export const UNREADABLE_MESSAGE = 'The server sent data the app could not read.'
export const UNKNOWN_MESSAGE = 'Something went wrong. Please try again.'
export const UNAVAILABLE_MESSAGE = 'The server is not available right now. Please try again in a moment.'
export const TIMEOUT_MESSAGE = 'The server took too long to answer. Please try again.'

export class ApiError extends Error {
  /** HTTP status, or 0 when the server could not be reached. */
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type ValidationItem = { loc?: unknown; msg?: unknown; type?: unknown }

function sentence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  const capitalised = trimmed[0].toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`
}

function fieldName(loc: unknown): string {
  if (!Array.isArray(loc)) return ''
  return loc.slice(1).filter((part): part is string => typeof part === 'string').join('.')
}

function validationLine(item: ValidationItem): string {
  if (typeof item.msg !== 'string') return ''
  const msg =
    item.type === 'string_pattern_mismatch'
      ? 'not in the expected format'
      : item.msg.replace(/^Value error, /, '')
  const field = fieldName(item.loc)
  return sentence(field ? `${field}: ${msg}` : msg)
}

/**
 * Turns an error body from the API into one readable message.
 * FastAPI sends `detail` as plain text for errors the app raises itself (404, a decline
 * window that cannot be fitted), and as a list of `{ loc, msg }` when input is rejected.
 */
export function errorMessage(status: number, body: unknown): string {
  const detail = body && typeof body === 'object' ? (body as { detail?: unknown }).detail : undefined

  if (typeof detail === 'string' && detail.trim()) {
    return sentence(detail)
  }

  if (Array.isArray(detail)) {
    const lines = detail.map((item: ValidationItem) => validationLine(item)).filter(Boolean)
    if (lines.length) return lines.join(' ')
  }

  // a proxy in front of the API (Vite here, Heroku or Cloudflare live) answers these when the API is down or waking up
  if (status === 502 || status === 503 || status === 504) return UNAVAILABLE_MESSAGE

  return `The server answered with error ${status}.`
}

export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'
}

/** The message to show for any error from an API call, or null when the call was cancelled on purpose. */
export function describeError(error: unknown): string | null {
  if (isAbortError(error)) return null
  if (error instanceof ApiError) return error.message
  return UNKNOWN_MESSAGE
}
