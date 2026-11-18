import { useMemo, useState } from 'react'
import { PageFooter } from '@/components/layout/PageFooter'
import { PageHeader } from '@/components/layout/PageHeader'
import { useSnapshot } from '@/components/layout/snapshot-context'
import { LargestFieldsCard } from '@/components/shelf/LargestFieldsCard'
import { ShelfMapCard } from '@/components/shelf/ShelfMapCard'
import { ShelfProductionCard } from '@/components/shelf/ShelfProductionCard'
import { ShelfStats } from '@/components/shelf/ShelfStats'
import { pageTitle } from '@/config'
import { getFields, getShelf } from '@/lib/api/client'
import { useApi } from '@/lib/api/use-api'
import { yearRange } from '@/lib/shelf'

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

  return (
    <>
      <title>{pageTitle('Shelf map')}</title>
      <PageHeader title="Shelf map" />
      <ShelfStats shelf={shelf} fields={fields} />
      <div className="mt-4 flex flex-wrap items-start gap-4">
        <ShelfMapCard
          className="flex-[3_1_560px]"
          fields={fields}
          year={year}
          range={range}
          onYearChange={setChosenYear}
        />
        <div className="flex min-w-0 flex-[2_1_400px] flex-col gap-4">
          <ShelfProductionCard shelf={shelf} year={year} />
          <LargestFieldsCard fields={fields} />
        </div>
      </div>
      <PageFooter />
    </>
  )
}
