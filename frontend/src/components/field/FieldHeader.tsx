import type { ReactNode } from 'react'
import { Coordinates, ProductLabel, StatusLabel } from '@/components/DataLabels'
import { Skeleton } from '@/components/ui/skeleton'
import type { FieldDetail } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'

const titleClass = 'text-[28px] leading-[1.15] font-medium'

/** The title block of design v2: the field name, one meta row under it, and the field picker on the right. */
export function FieldHeader({ detail, picker }: { detail: ApiState<FieldDetail>; picker: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        {detail.status === 'ready' ? (
          <>
            <h1 className={titleClass}>{detail.data.name}</h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-text-2">
              <StatusLabel status={detail.data.status} />
              <ProductLabel product={detail.data.main_product} />
              {detail.data.operator && <span>{detail.data.operator}</span>}
              {detail.data.lat !== null && detail.data.lon !== null && (
                <Coordinates lat={detail.data.lat} lon={detail.data.lon} />
              )}
            </p>
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
