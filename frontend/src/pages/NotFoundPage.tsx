import { Link } from 'react-router'
import { NOT_FOUND_LABEL } from '@/components/layout/nav'
import { PageFooter } from '@/components/layout/PageFooter'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { pageTitle } from '@/config'

export function NotFoundPage() {
  return (
    <>
      <title>{pageTitle(NOT_FOUND_LABEL)}</title>
      <PageHeader title={NOT_FOUND_LABEL} />
      <p className="mb-4 text-sm text-text-2">There is no page at this address.</p>
      <Button asChild variant="outline" className="h-9 px-3">
        <Link to="/">Go to the shelf map</Link>
      </Button>
      <PageFooter />
    </>
  )
}
