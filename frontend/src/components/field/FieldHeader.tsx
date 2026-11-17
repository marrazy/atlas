import type { ReactNode } from 'react'
import { ProductBadge } from '@/components/ProductBadge'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { FieldDetail } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { describeField } from '@/lib/field'

const titleClass = 'text-[28px] leading-tight font-bold tracking-heading'

export function FieldHeader({ detail, picker }: { detail: ApiState<FieldDetail>; picker: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        {detail.status === 'ready' ? (
          <>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className={titleClass}>{detail.data.name}</h1>
              <Badge variant="outline" className="h-6 px-2.5">
                {detail.data.status}
              </Badge>
              <ProductBadge product={detail.data.main_product} />
              {detail.data.operator && (
                <Badge variant="secondary" className="h-6 px-2.5">
                  {detail.data.operator}
                </Badge>
              )}
            </div>
            <p className="max-w-[640px] text-sm leading-normal text-muted-foreground">{describeField(detail.data)}</p>
          </>
        ) : detail.status === 'loading' ? (
          <>
            <h1 className={titleClass}>
              <span className="sr-only">Loading field</span>
              <Skeleton aria-hidden="true" className="h-8 w-40" />
            </h1>
            <Skeleton className="h-4 w-80 max-w-full" />
          </>
        ) : (
          <h1 className={titleClass}>Field deep dive</h1>
        )}
      </div>
      {picker}
    </div>
  )
}
