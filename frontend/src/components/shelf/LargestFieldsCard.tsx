import { Link } from 'react-router'
import { ChartCard } from '@/components/ChartCard'
import { Coordinates, ProductLabel } from '@/components/DataLabels'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { FieldSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { formatNumber } from '@/lib/format'
import { LARGEST_FIELDS_COUNT, largestFields } from '@/lib/shelf'

export function LargestFieldsCard({ fields }: { fields: ApiState<FieldSummary[]> }) {
  const head = 'h-9 px-3 text-xs font-normal text-muted-foreground'
  const cell = 'h-[52px] px-3 py-0 text-[13px] text-text-2'
  // on a phone the table keeps the field, its product and its total, and the field's page has the rest
  const wide = 'hidden sm:table-cell'

  return (
    <ChartCard title="Largest fields" busy={fields.status === 'loading'}>
      {fields.status === 'error' && <ErrorNotice message={fields.message} onRetry={fields.retry} />}
      {fields.status === 'loading' && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: LARGEST_FIELDS_COUNT }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}
      {fields.status === 'ready' && (
        <div className="-mx-3">
          <Table>
            <TableCaption className="sr-only">
              The {LARGEST_FIELDS_COUNT} largest fields by total saleable production, in million Sm³ oil equivalent
            </TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={head}>Field</TableHead>
                <TableHead className={`${head} whitespace-normal`}>Main product</TableHead>
                <TableHead className={`${head} ${wide} whitespace-normal`}>First production</TableHead>
                <TableHead className={`${head} ${wide}`}>Operator</TableHead>
                <TableHead className={`${head} text-right whitespace-normal`}>Million Sm³ o.e.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {largestFields(fields.data).map((f) => (
                <TableRow key={f.field_id} className="hover:bg-transparent">
                  <TableCell className={cell}>
                    <div className="flex flex-col gap-0.5 whitespace-normal">
                      <Link to={`/fields/${f.field_id}`} className="w-fit rounded-sm text-sm text-foreground hover:underline">
                        {f.name}
                      </Link>
                      {f.lat !== null && f.lon !== null && <Coordinates lat={f.lat} lon={f.lon} className="text-[11px]" />}
                    </div>
                  </TableCell>
                  <TableCell className={cell}>
                    <ProductLabel product={f.main_product} />
                  </TableCell>
                  <TableCell className={`${cell} ${wide} font-mono`}>{f.first_production_year}</TableCell>
                  <TableCell className={`${cell} ${wide}`}>{f.operator ?? 'Not in the data'}</TableCell>
                  <TableCell className={`${cell} text-right font-mono text-foreground`}>{formatNumber(f.cum_oe_net_msm3)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ChartCard>
  )
}
