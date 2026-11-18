export const PAGE_FILE_MESSAGE = 'This page could not load. The site may have been updated since you opened it.'
export const PAGE_ERROR_MESSAGE = 'Something went wrong while showing this page.'

/** Browsers word a failed download of a page file differently, so these cover Chrome, Firefox and Safari. */
export function isPageFileError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|importing a module script failed/i.test(message)
}
