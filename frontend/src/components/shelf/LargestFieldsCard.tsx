import { Link } from 'react-router'
import { ChartCard } from '@/components/ChartCard'
import { ErrorNotice } from '@/components/ErrorNotice'
import { ProductBadge } from '@/components/ProductBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { FieldSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { formatNumber } from '@/lib/format'
import { LARGEST_FIELDS_COUNT, largestFields } from '@/lib/shelf'

type Props = {
  fields: ApiState<FieldSummary[]>
  /** The last month in the snapshot, for example "August 2026", since the totals include the unfinished year. */
  until: string | null
}

export function LargestFieldsCard({ fields, until }: Props) {
  const head = 'h-10 text-[13px] text-muted-foreground'
  const cell = 'h-11 py-0 text-[13px]'

  return (
    <ChartCard
      title="Largest fields"
      description={`By total saleable production${until ? `, up to ${until}` : ''}.`}
      busy={fields.status === 'loading'}
    >
      {fields.status === 'error' && <ErrorNotice message={fields.message} onRetry={fields.retry} />}
      {fields.status === 'loading' && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: LARGEST_FIELDS_COUNT }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      )}
      {fields.status === 'ready' && (
        <Table>
          <TableCaption className="sr-only">
            The {LARGEST_FIELDS_COUNT} largest fields by total saleable production, in million Sm³ oil equivalent.
          </TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={head}>Field</TableHead>
              <TableHead className={head}>Main product</TableHead>
              <TableHead className={head}>First production</TableHead>
              <TableHead className={head}>Operator</TableHead>
              <TableHead className={`${head} text-right`}>Million Sm³ o.e.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {largestFields(fields.data).map((f) => (
              <TableRow key={f.field_id}>
                <TableCell className={`${cell} font-medium`}>
                  <Link
                    to={`/fields/${f.field_id}`}
                    className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {f.name}
                  </Link>
                </TableCell>
                <TableCell className={cell}>
                  <ProductBadge product={f.main_product} />
                </TableCell>
                <TableCell className={`${cell} font-mono text-muted-foreground`}>{f.first_production_year}</TableCell>
                <TableCell className={`${cell} text-muted-foreground`}>{f.operator ?? 'Not in the data'}</TableCell>
                <TableCell className={`${cell} text-right font-mono tabular-nums`}>
                  {formatNumber(f.cum_oe_net_msm3)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ChartCard>
  )
}
