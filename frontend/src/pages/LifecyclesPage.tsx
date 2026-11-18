import { LifecycleCard } from '@/components/lifecycles/LifecycleCard'
import { LifecycleStats } from '@/components/lifecycles/LifecycleStats'
import { PageHeader } from '@/components/layout/PageHeader'
import { useSnapshot } from '@/components/layout/snapshot-context'
import { LIFECYCLE_MIN_CUM, VOLVE_ID, pageTitle } from '@/config'
import { getLifecycles } from '@/lib/api/client'
import { useApi } from '@/lib/api/use-api'

export function LifecyclesPage() {
  const snapshot = useSnapshot()
  // Volve is highlighted first, so it is asked for by id in case it is ever under the size limit
  const highlightId = VOLVE_ID
  const lifecycles = useApi(`lifecycles:${highlightId}`, (signal) =>
    getLifecycles({ minCum: LIFECYCLE_MIN_CUM, include: [highlightId], signal }),
  )

  return (
    <>
      <title>{pageTitle('Field lifecycles')}</title>
      <PageHeader
        title="Field lifecycles"
        description="The larger fields lined up at their first year of production, each shown as a share of its own best year, so big and small fields can be compared."
      />
      <LifecycleStats lifecycles={lifecycles} />
      <div className="mt-4">
        <LifecycleCard
          lifecycles={lifecycles}
          highlightId={highlightId}
          lastFullYear={snapshot.status === 'ready' ? snapshot.data.last_full_year : null}
        />
      </div>
    </>
  )
}
