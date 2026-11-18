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

/** Only fields that produced at least this much are compared on the lifecycles page, million Sm³ o.e. Sent to /api/lifecycles. */
export const LIFECYCLE_MIN_CUM = 8

/**
 * The API also leaves out fields with fewer years of production than this. The value is MIN_LIFECYCLE_YEARS in
 * backend/src/api/routes.py, repeated here only so the page can explain the rule. Keep the two the same.
 */
export const LIFECYCLE_MIN_YEARS = 4

/** The fields offered to highlight on the lifecycles page, from the design: Volve, Statfjord, Troll, Ekofisk, Gullfaks and Johan Sverdrup. */
export const LIFECYCLE_PICKS = [VOLVE_ID, 43658, 46437, 43506, 43686, 26376286]

/** How many of the largest fields the years near peak bars show, besides the fields that can be highlighted. */
export const NEAR_PEAK_LARGEST = 15
