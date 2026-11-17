export const SITE_NAME = 'North Sea Field Atlas'

export const VOLVE_ID = 3420717

/** The field the deep dive opens on. */
export const DEFAULT_FIELD_ID = VOLVE_ID

/**
 * Share of Volve's oil in place that was recovered, published by Equinor. It is not in the
 * Sodir data, so the plan allows this one value, shown only for Volve and with its source.
 */
export const VOLVE_RECOVERY_PERCENT = 54

export const SOURCE_CODE_URL = 'https://github.com/marrazy/atlas'

/** The licence asks for this credit on every screen. It matches `attribution` from /api/snapshot. */
export const DATA_CREDIT =
  'Data from the Norwegian Offshore Directorate (Sodir), Norwegian Licence for Open Government Data (NLOD).'

export function pageTitle(label: string): string {
  return `${label} · ${SITE_NAME}`
}
