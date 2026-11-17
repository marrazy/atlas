import { Link, useNavigate, useParams } from 'react-router'
import { ErrorNotice } from '@/components/ErrorNotice'
import { FieldHeader } from '@/components/field/FieldHeader'
import { FieldPicker } from '@/components/field/FieldPicker'
import { FieldStats } from '@/components/field/FieldStats'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { pageTitle } from '@/config'
import { getField, getFieldProduction, getFields } from '@/lib/api/client'
import { useApi } from '@/lib/api/use-api'

function FieldNotFound() {
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

function FieldView({ fieldId }: { fieldId: number }) {
  const navigate = useNavigate()
  const detail = useApi(`field:${fieldId}`, (signal) => getField(fieldId, { signal }))
  const production = useApi(`production:${fieldId}`, (signal) => getFieldProduction(fieldId, { signal }))
  const fields = useApi('fields', (signal) => getFields({ signal }))

  if (detail.status === 'error' && detail.httpStatus === 404) return <FieldNotFound />

  const picker = (
    <FieldPicker
      fields={fields}
      currentId={fieldId}
      currentName={detail.status === 'ready' ? detail.data.name : undefined}
      onSelect={(id) => navigate(`/fields/${id}`)}
    />
  )

  return (
    <>
      <title>{pageTitle(detail.status === 'ready' ? detail.data.name : 'Field deep dive')}</title>
      <FieldHeader detail={detail} picker={picker} />
      {detail.status === 'error' ? (
        <ErrorNotice message={detail.message} />
      ) : (
        <FieldStats detail={detail} production={production} />
      )}
    </>
  )
}

export function FieldPage() {
  const { fieldId = '' } = useParams()
  if (!/^\d+$/.test(fieldId)) return <FieldNotFound />
  return <FieldView fieldId={Number(fieldId)} />
}
