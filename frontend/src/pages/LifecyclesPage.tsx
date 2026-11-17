import { PageHeader } from '@/components/layout/PageHeader'
import { pageTitle } from '@/config'

export function LifecyclesPage() {
  return (
    <>
      <title>{pageTitle('Field lifecycles')}</title>
      <PageHeader
        title="Field lifecycles"
        description="Every field lined up at its first year of production, shown as a share of its own best year so big and small fields can be compared."
      />
    </>
  )
}
