import { describe, expect, it } from 'vitest'
import { apiErrors } from '@/test/fixtures'
import { ApiError, UNKNOWN_MESSAGE, describeError, errorMessage } from './errors'

const message = (name: keyof typeof apiErrors) => errorMessage(apiErrors[name].status, apiErrors[name].body)

describe('errorMessage, when detail is plain text', () => {
  it.each([
    ['fieldNotFound', 'No field with id 1.'],
    ['routeNotFound', 'Not Found.'],
    ['tooFewMonths', 'Need at least 6 months with production to fit a decline curve.'],
    ['outsideProduction', 'No production data in that window.'],
  ] as const)('%s gives "%s"', (name, expected) => {
    expect(message(name)).toBe(expected)
  })
})

describe('errorMessage, when detail is a list of rejected inputs', () => {
  it.each([
    ['idNotANumber', 'Field_id: Input should be a valid integer, unable to parse string as an integer.'],
    ['negativeMinCum', 'Min_cum: Input should be greater than or equal to 0.'],
    ['includeNotANumber', 'Include: Input should be a valid integer, unable to parse string as an integer.'],
    ['missingField', 'Field_id: Field required.'],
    ['badJson', 'JSON decode error.'],
  ] as const)('%s gives "%s"', (name, expected) => {
    expect(message(name)).toBe(expected)
  })

  it('drops the "Value error," prefix that Pydantic adds to our own checks', () => {
    expect(message('windowBackwards')).toBe('End must be after start.')
  })

  it('joins several problems into one message and hides the raw pattern', () => {
    const text = message('twoBadInputs')
    expect(text).toBe("Start: not in the expected format. Model: Input should be 'exponential', 'hyperbolic' or 'harmonic'.")
    expect(text).not.toContain('\\d{4}')
  })
})

describe('errorMessage, when there is no usable detail', () => {
  it.each([
    ['an HTML error page', 502, undefined],
    ['an empty object', 500, {}],
    ['an empty text detail', 500, { detail: '  ' }],
    ['a list with nothing readable', 422, { detail: [{ loc: ['body'] }] }],
    ['null', 503, null],
  ])('falls back to the status code for %s', (_name, status, body) => {
    expect(errorMessage(status, body)).toBe(`The server answered with error ${status}.`)
  })
})

describe('describeError', () => {
  it('gives the message of an ApiError', () => {
    expect(describeError(new ApiError(404, 'No field with id 1.'))).toBe('No field with id 1.')
  })

  it('gives nothing for a request we cancelled on purpose', () => {
    expect(describeError(new DOMException('The operation was aborted.', 'AbortError'))).toBeNull()
  })

  it('gives a general message for any other error', () => {
    expect(describeError(new TypeError('x is undefined'))).toBe(UNKNOWN_MESSAGE)
    expect(describeError('oops')).toBe(UNKNOWN_MESSAGE)
  })
})
