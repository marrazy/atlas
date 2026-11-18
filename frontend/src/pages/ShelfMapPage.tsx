import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useSnapshot } from '@/components/layout/snapshot-context'
import { LargestFieldsCard } from '@/components/shelf/LargestFieldsCard'
import { ShelfMapCard } from '@/components/shelf/ShelfMapCard'
import { ShelfProductionCard } from '@/components/shelf/ShelfProductionCard'
import { ShelfStats } from '@/components/shelf/ShelfStats'
import { pageTitle } from '@/config'
import { getFields, getShelf } from '@/lib/api/client'
import { useApi } from '@/lib/api/use-api'
import { formatMonth } from '@/lib/format'
import { firstField, yearRange } from '@/lib/shelf'

export function ShelfMapPage() {
  const snapshot = useSnapshot()
  const shelf = useApi('shelf', (signal) => getShelf({ signal }))
  const fields = useApi('fields', (signal) => getFields({ signal }))

  const range = useMemo(
    () =>
      fields.status === 'ready' && snapshot.status === 'ready'
        ? yearRange(fields.data, snapshot.data.last_full_year)
        : null,
    [fields, snapshot],
  )
  // the slider starts on the last full year until the visitor picks another
  const [chosenYear, setChosenYear] = useState<number | null>(null)
  const year = chosenYear ?? range?.[1] ?? null

  const first = fields.status === 'ready' ? firstField(fields.data) : null
  const until = snapshot.status === 'ready' ? formatMonth(snapshot.data.last_month, 'long') : null
  const description =
    first && until
      ? `Every oil and gas field on the Norwegian Continental Shelf, from ${first.name} in ${first.year} to ${until}.`
      : 'Every oil and gas field on the Norwegian Continental Shelf.'

  return (
    <>
      <title>{pageTitle('Shelf map')}</title>
      <PageHeader title="Shelf map" description={description} />
      <ShelfStats shelf={shelf} fields={fields} snapshot={snapshot} />
      <div className="mt-4">
        <ShelfMapCard fields={fields} year={year} range={range} onYearChange={setChosenYear} />
      </div>
      <div className="mt-4">
        <ShelfProductionCard shelf={shelf} year={year} />
      </div>
      <div className="mt-4">
        <LargestFieldsCard fields={fields} until={until} />
      </div>
    </>
  )
}
