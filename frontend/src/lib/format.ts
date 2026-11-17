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

/** "2026-08" → "Aug 2026" (short) or "August 2026" (long). */
export function formatMonth(month: YearMonth, style: keyof typeof monthFormats = 'short'): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return monthFormats[style].format(Date.UTC(year, monthNumber - 1, 1))
}
