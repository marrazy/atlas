import { useMemo, useState } from 'react'
import { HighlightPicker } from '@/components/lifecycles/HighlightPicker'
import { LifecycleCard } from '@/components/lifecycles/LifecycleCard'
import { LifecycleStats } from '@/components/lifecycles/LifecycleStats'
import { NearPeakCard } from '@/components/lifecycles/NearPeakCard'
import { PageFooter } from '@/components/layout/PageFooter'
import { PageHeader } from '@/components/layout/PageHeader'
import { LIFECYCLE_MIN_CUM, LIFECYCLE_PICKS, VOLVE_ID, pageTitle } from '@/config'
import { getFields, getLifecycles } from '@/lib/api/client'
import { useApi } from '@/lib/api/use-api'

export function LifecyclesPage() {
  // the fields that can be highlighted are asked for by id, in case one is ever under the size limit
  const lifecycles = useApi('lifecycles', (signal) =>
    getLifecycles({ minCum: LIFECYCLE_MIN_CUM, include: LIFECYCLE_PICKS, signal }),
  )
  const fields = useApi('fields', (signal) => getFields({ signal }))
  const [highlightId, setHighlightId] = useState(VOLVE_ID)

  // names come from the data, and a field missing from it gets no button
  const options = useMemo(() => {
    if (lifecycles.status !== 'ready') return []
    const byId = new Map(lifecycles.data.fields.map((f) => [f.field_id, f.name]))
    return LIFECYCLE_PICKS.flatMap((id) => (byId.has(id) ? [{ id, name: byId.get(id)! }] : []))
  }, [lifecycles])

  return (
    <>
      <title>{pageTitle('Field lifecycles')}</title>
      <PageHeader title="Field lifecycles" />
      <LifecycleStats lifecycles={lifecycles} />
      <div className="mt-6">
        <HighlightPicker options={options} value={highlightId} onChange={setHighlightId} />
      </div>
      <div className="mt-4 flex flex-wrap items-start gap-4">
        <LifecycleCard className="flex-[3_1_560px]" lifecycles={lifecycles} highlightId={highlightId} />
        <NearPeakCard className="flex-[1_1_320px]" lifecycles={lifecycles} fields={fields} highlightId={highlightId} />
      </div>
      <PageFooter />
    </>
  )
}
