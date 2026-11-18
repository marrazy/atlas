import type { MainProduct } from '@/lib/api/types'
import { formatCoordinates } from '@/lib/coordinates'
import { productLabel } from '@/lib/field'
import { cn } from '@/lib/utils'

function Dot({ className }: { className: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-2 shrink-0 rounded-full', className)} />
}

/** Main product: an 8px dot in the product colour and the word. The word is always there, so colour is never the only clue. */
export function ProductLabel({ product }: { product: MainProduct }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Dot className={product === 'oil' ? 'bg-oil' : 'bg-gas'} />
      {productLabel(product)}
    </span>
  )
}

/** Status: a filled green dot for producing, a muted ring for shut down, a filled muted dot for anything else. */
export function StatusLabel({ status }: { status: string }) {
  const dot =
    status === 'Producing'
      ? 'bg-positive'
      : status === 'Shut down'
        ? 'border-[1.5px] border-muted-foreground bg-transparent'
        : 'bg-muted-foreground'
  return (
    <span className="inline-flex items-center gap-1.5">
      <Dot className={dot} />
      {status}
    </span>
  )
}

/** A field position in mono and the muted colour, like 58°26′N 001°53′E. */
export function Coordinates({ lat, lon, className }: { lat: number; lon: number; className?: string }) {
  return <span className={cn('font-mono text-muted-foreground', className)}>{formatCoordinates(lat, lon)}</span>
}
