import { VOLVE_ID } from '@/config'
import type { FieldDetail } from '@/lib/api/types'

/** Where each number on the field page comes from, as in the design's footnote. */
export function FieldSources({ field }: { field: FieldDetail }) {
  const volve = field.field_id === VOLVE_ID

  return (
    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
      Production and investment from Sodir FactPages (NLOD).{volve && ' Recovery rate from Equinor.'} The economic
      limit is an example setting. The forecast range is the rough 95% range the API gives for the fit.{' '}
      <a
        href={field.factpage_url}
        className="text-foreground underline underline-offset-2 hover:no-underline"
        target="_blank"
        rel="noreferrer"
        aria-label={`${field.name} on Sodir FactPages (opens in a new tab)`}
      >
        {field.name} on Sodir FactPages
      </a>
      .
    </p>
  )
}
