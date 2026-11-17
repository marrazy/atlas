import type { FieldDetail, MainProduct, ProductionMonth, YearMonth } from '@/lib/api/types'

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function productLabel(product: MainProduct): string {
  return capitalise(product)
}

/** "OIL/GAS" → "Oil and gas", "GAS/CONDENSATE" → "Gas and condensate". */
export function hydrocarbonLabel(hcType: string): string {
  return capitalise(hcType.toLowerCase().split('/').join(' and '))
}

/** "North sea" → "North Sea". */
export function areaLabel(mainArea: string): string {
  return mainArea.split(' ').map(capitalise).join(' ')
}

/** A short line about the field, built only from Sodir data. */
export function describeField(
  field: Pick<FieldDetail, 'hc_type' | 'main_area' | 'discovery_year' | 'operator_full'>,
): string {
  const discovered = field.discovery_year ? `, discovered in ${field.discovery_year}` : ''
  const operated = field.operator_full ? ` Operated by ${field.operator_full}.` : ''
  return `${hydrocarbonLabel(field.hc_type)} field in the ${areaLabel(field.main_area)}${discovered}.${operated}`
}

/** First and last month with output, or null when the field has none. The API sends months in order. */
export function productionSpan(months: ProductionMonth[]): { first: YearMonth; last: YearMonth } | null {
  if (months.length === 0) return null
  return { first: months[0].month, last: months[months.length - 1].month }
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

/** "Åsgard" → "asgard", "Oseberg Øst" → "oseberg-ost". For file names. */
export function fieldSlug(name: string): string {
  const slug = foldForSearch(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'field'
}

/** Search score for the field picker: names starting with the search first, then names containing it. */
export function matchField(_value: string, search: string, keywords: string[] = []): number {
  const query = foldForSearch(search.trim())
  if (!query) return 1
  if (keywords.some((name) => name.startsWith(query))) return 1
  if (keywords.some((name) => name.includes(query))) return 0.5
  return 0
}
