import type { MainProduct, ProductionMonth, YearMonth } from '@/lib/api/types'

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function productLabel(product: MainProduct): string {
  return capitalise(product)
}

/** First and last month with output, or null when the field has none. The API sends months in order. */
export function productionSpan(months: ProductionMonth[]): { first: YearMonth; last: YearMonth } | null {
  if (months.length === 0) return null
  return { first: months[0].month, last: months[months.length - 1].month }
}

/** Months from the first to the last month with production, in years. Feb 2008 to Sep 2016 is 103 months, 8.6 years. */
export function producingLifeYears(span: { first: YearMonth; last: YearMonth }): number {
  const [fy, fm] = span.first.split('-').map(Number)
  const [ly, lm] = span.last.split('-').map(Number)
  return ((ly - fy) * 12 + (lm - fm)) / 12
}

/** Lower case, with Norwegian letters written the way people type them without a Norwegian keyboard. */
export function foldForSearch(text: string): string {
  return text
    .toLowerCase()
    .replaceAll('æ', 'ae')
    .replaceAll('ø', 'o')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Search score for the field picker: names starting with the search first, then names containing it. */
export function matchField(_value: string, search: string, keywords: string[] = []): number {
  const query = foldForSearch(search.trim())
  if (!query) return 1
  if (keywords.some((name) => name.startsWith(query))) return 1
  if (keywords.some((name) => name.includes(query))) return 0.5
  return 0
}
