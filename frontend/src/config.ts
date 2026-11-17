export const SITE_NAME = 'North Sea Field Atlas'

/** Volve, the field the deep dive opens on. */
export const DEFAULT_FIELD_ID = 3420717

export const SOURCE_CODE_URL = 'https://github.com/marrazy/atlas'

/** The licence asks for this credit on every screen. It matches `attribution` from /api/snapshot. */
export const DATA_CREDIT =
  'Data from the Norwegian Offshore Directorate (Sodir), Norwegian Licence for Open Government Data (NLOD).'

export function pageTitle(label: string): string {
  return `${label} · ${SITE_NAME}`
}
