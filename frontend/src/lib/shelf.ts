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
