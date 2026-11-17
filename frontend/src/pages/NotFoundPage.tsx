import { Link } from 'react-router'
import { NOT_FOUND_LABEL } from '@/components/layout/nav'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { pageTitle } from '@/config'

export function NotFoundPage() {
  return (
    <>
      <title>{pageTitle(NOT_FOUND_LABEL)}</title>
      <PageHeader title={NOT_FOUND_LABEL} description="There is no page at this address." />
      <Button asChild variant="outline" className="h-10 px-3">
        <Link to="/">Go to the shelf map</Link>
      </Button>
    </>
  )
}
