import { PageHeader } from '@/components/layout/PageHeader'
import { pageTitle } from '@/config'

export function ShelfMapPage() {
  return (
    <>
      <title>{pageTitle('Shelf map')}</title>
      <PageHeader title="Shelf map" description="Every oil and gas field on the Norwegian Continental Shelf." />
    </>
  )
}
