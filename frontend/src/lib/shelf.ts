import type { FieldSummary } from '@/lib/api/types'

export type FieldCounts = {
  /** Fields with a location, so they can be drawn on the map. */
  mapped: number
  /** Mapped fields with no production year at all. Status alone is not used, because some approved fields produced before. */
  mappedNotProducedYet: number
}

export function fieldCounts(fields: FieldSummary[]): FieldCounts {
  const mapped = fields.filter((f) => f.lon !== null && f.lat !== null)
  return {
    mapped: mapped.length,
    mappedNotProducedYet: mapped.filter((f) => f.producing_years.length === 0).length,
  }
}

/**
 * The years the slider covers: from the first year any field produced to the last full year in the
 * snapshot, so the unfinished current year is left out, as in the shelf chart. 1971 to 2025.
 */
export function yearRange(fields: FieldSummary[], lastFullYear: number): [number, number] | null {
  const years = fields.flatMap((f) => f.producing_years).filter((y) => y <= lastFullYear)
  if (years.length === 0) return null
  return [Math.min(...years), Math.max(...years)]
}

/** The field with the earliest first production year, with that year. Ekofisk, 1971. */
export function firstField(fields: FieldSummary[]): { name: string; year: number } | null {
  let first: { name: string; year: number } | null = null
  for (const f of fields) {
    if (f.first_production_year !== null && (!first || f.first_production_year < first.year)) {
      first = { name: f.name, year: f.first_production_year }
    }
  }
  return first
}
