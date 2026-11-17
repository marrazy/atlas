import { Link, useParams } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { pageTitle } from '@/config'

export function FieldPage() {
  const { fieldId = '' } = useParams()

  if (!/^\d+$/.test(fieldId)) {
    return (
      <>
        <title>{pageTitle('Field not found')}</title>
        <PageHeader title="Field not found" description="There is no field at this address." />
        <Button asChild variant="outline" className="h-10 px-3">
          <Link to="/fields">Open the field deep dive</Link>
        </Button>
      </>
    )
  }

  return (
    <>
      <title>{pageTitle('Field deep dive')}</title>
      <PageHeader title="Field deep dive" />
    </>
  )
}
