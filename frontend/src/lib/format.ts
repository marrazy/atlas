import type { YearMonth } from '@/lib/api/types'

const monthFormats = {
  short: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
  long: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
}

/** 56129.3 → "56,129". With fractionDigits 1: 63.335 → "63.3". */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/** Axis labels: 200 → "200", 2500 → "2.5k", 10000 → "10k", 1000000 → "1M". */
export function formatCompact(value: number): string {
  const [divisor, suffix] = Math.abs(value) >= 1e6 ? [1e6, 'M'] : Math.abs(value) >= 1e3 ? [1e3, 'k'] : [1, '']
  const scaled = value / divisor
  return `${formatNumber(scaled, Number.isInteger(scaled) ? 0 : 1)}${suffix}`
}

/** "2008-12" → the start of that month in UTC milliseconds, for a chart time axis. */
export function monthStart(month: YearMonth): number {
  const [year, monthNumber] = month.split('-').map(Number)
  return Date.UTC(year, monthNumber - 1, 1)
}

/** The opposite of monthStart: UTC milliseconds → "2008-12". */
export function monthOf(time: number): YearMonth {
  const date = new Date(time)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/** "2026-08" → "Aug 2026" (short) or "August 2026" (long). */
export function formatMonth(month: YearMonth, style: keyof typeof monthFormats = 'short'): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return monthFormats[style].format(Date.UTC(year, monthNumber - 1, 1))
}
