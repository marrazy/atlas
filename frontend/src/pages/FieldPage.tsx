import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChartCard } from '@/components/ChartCard'
import { ErrorNotice } from '@/components/ErrorNotice'
import { DeclineCard } from '@/components/field/DeclineCard'
import { FieldHeader } from '@/components/field/FieldHeader'
import { FieldPicker } from '@/components/field/FieldPicker'
import { FieldSources } from '@/components/field/FieldSources'
import { FieldStats } from '@/components/field/FieldStats'
import { InvestmentCard } from '@/components/field/InvestmentCard'
import { ProductionCard } from '@/components/field/ProductionCard'
import { PageFooter } from '@/components/layout/PageFooter'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { VOLVE_ID, VOLVE_PRODUCTION_NOTE, pageTitle } from '@/config'
import { getField, getFieldInvestments, getFieldProduction, getFields } from '@/lib/api/client'
import { useApi } from '@/lib/api/use-api'
import { fitWindow } from '@/lib/decline'

function FieldNotFound() {
  return (
    <>
      <title>{pageTitle('Field not found')}</title>
      <PageHeader title="Field not found" />
      <p className="mb-4 text-sm text-text-2">There is no field at this address.</p>
      <Button asChild variant="outline" className="h-9 px-3">
        <Link to="/fields">Open the field deep dive</Link>
      </Button>
      <PageFooter />
    </>
  )
}

function FieldView({ fieldId }: { fieldId: number }) {
  const navigate = useNavigate()
  const detail = useApi(`field:${fieldId}`, (signal) => getField(fieldId, { signal }))
  const production = useApi(`production:${fieldId}`, (signal) => getFieldProduction(fieldId, { signal }))
  const fields = useApi('fields', (signal) => getFields({ signal }))
  const investments = useApi(`investments:${fieldId}`, (signal) => getFieldInvestments(fieldId, { signal }))
  const window = useMemo(() => (production.status === 'ready' ? fitWindow(production.data) : null), [production])

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
        <ErrorNotice message={detail.message} onRetry={detail.retry} />
      ) : (
        <>
          <FieldStats detail={detail} production={production} />
          <div className="mt-4">
            <ProductionCard
              fieldName={detail.status === 'ready' ? detail.data.name : ''}
              production={detail.status === 'ready' ? production : { status: 'loading' }}
              note={fieldId === VOLVE_ID ? VOLVE_PRODUCTION_NOTE : null}
            />
          </div>
          <div className="mt-4">
            {detail.status === 'ready' && production.status === 'ready' ? (
              production.data.length > 0 && (
                <DeclineCard field={detail.data} months={production.data} window={window} />
              )
            ) : production.status !== 'error' ? (
              <ChartCard title="Decline curve" busy>
                <Skeleton className="h-[300px] w-full" />
              </ChartCard>
            ) : null}
          </div>
          <div className="mt-4">
            <InvestmentCard
              fieldName={detail.status === 'ready' ? detail.data.name : ''}
              investments={detail.status === 'ready' ? investments : { status: 'loading' }}
            />
          </div>
          {detail.status === 'ready' ? <FieldSources field={detail.data} /> : <PageFooter />}
        </>
      )}
      {detail.status === 'error' && <PageFooter />}
    </>
  )
}

export function FieldPage() {
  const { fieldId = '' } = useParams()
  if (!/^\d+$/.test(fieldId)) return <FieldNotFound />
  return <FieldView fieldId={Number(fieldId)} />
}
