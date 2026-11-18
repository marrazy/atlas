import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LIFECYCLE_MIN_YEARS } from '@/config'
import { BACKEND_RULES } from './backend-rules'
import { SM3_TO_BBL } from './units'

// the address goes through a variable, because Vite turns `new URL('…', import.meta.url)` into a file import
const here = import.meta.url
const backend = (file: string) => readFileSync(new URL(`../../../backend/src/api/${file}`, here), 'utf8')
const routes = backend('routes.py')
const decline = backend('decline.py')
const data = backend('data.py')

/** The number assigned to a constant at the start of a line, for example `NEAR_PEAK = 0.9`. */
function constant(source: string, name: string): number {
  const match = source.match(new RegExp(`^${name}\\s*=\\s*([\\d.]+)`, 'm'))
  if (!match) throw new Error(`${name} not found`)
  return Number(match[1])
}

describe('the rules the Methods page repeats still match the backend', () => {
  it('lifecycle rules in routes.py', () => {
    expect(BACKEND_RULES.minLifecycleYears).toBe(constant(routes, 'MIN_LIFECYCLE_YEARS'))
    expect(LIFECYCLE_MIN_YEARS).toBe(constant(routes, 'MIN_LIFECYCLE_YEARS'))
    expect(BACKEND_RULES.nearPeakShare).toBe(constant(routes, 'NEAR_PEAK'))
    expect(BACKEND_RULES.minFieldsForMedian).toBe(constant(routes, 'MIN_FIELDS_FOR_MEDIAN'))
  })

  it('the gas oil ratio limit in routes.py', () => {
    expect(BACKEND_RULES.minOilForGor).toBe(constant(routes, 'MIN_OIL_FOR_GOR'))
  })

  it('decline fit rules in decline.py', () => {
    const [, bMin, bMax] = decline.match(/^B_MIN, B_MAX = ([\d.]+), ([\d.]+)/m) ?? []
    expect([BACKEND_RULES.bMin, BACKEND_RULES.bMax]).toEqual([Number(bMin), Number(bMax)])
    expect(BACKEND_RULES.maxForecastMonths).toBe(constant(decline, 'MAX_FORECAST_MONTHS'))
    expect(decline).toMatch(new RegExp(`if len\\(q\\) < ${BACKEND_RULES.minFitMonths}:`))
  })

  it('the barrels factor in data.py and decline.py', () => {
    expect(SM3_TO_BBL).toBe(constant(data, 'SM3_TO_BBL'))
    expect(SM3_TO_BBL).toBe(constant(decline, 'SM3_TO_BBL'))
  })
})
