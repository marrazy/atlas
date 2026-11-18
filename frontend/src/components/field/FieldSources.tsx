import { PageFooter } from '@/components/layout/PageFooter'
import { VOLVE_ID } from '@/config'
import type { FieldDetail } from '@/lib/api/types'

/** The field page footer from design v2: where each number comes from. It credits Sodir, so it replaces the usual credit line. */
export function FieldSources({ field }: { field: FieldDetail }) {
  const volve = field.field_id === VOLVE_ID

  return (
    <PageFooter>
      Production and investment from the Norwegian Offshore Directorate (Sodir), NLOD.
      {volve && ' Recovery rate from Equinor.'} The economic limit and forecast range are example settings
      {volve ? ', not Equinor figures' : ''}.{' '}
      <a
        href={field.factpage_url}
        className="text-text-2 underline underline-offset-2 hover:text-foreground"
        target="_blank"
        rel="noreferrer"
        aria-label={`${field.name} on Sodir FactPages (opens in a new tab)`}
      >
        {field.name} on Sodir FactPages
      </a>
    </PageFooter>
  )
}
