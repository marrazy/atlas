import { Badge } from '@/components/ui/badge'
import type { MainProduct } from '@/lib/api/types'
import { productLabel } from '@/lib/field'
import { cn } from '@/lib/utils'

/** "Oil" or "Gas", on a light wash of the product colour. The word is always shown, so colour is never the only clue. */
export function ProductBadge({ product }: { product: MainProduct }) {
  return (
    <Badge className={cn('h-6 px-2.5 text-foreground', product === 'oil' ? 'bg-oil/22' : 'bg-gas/22')}>
      {productLabel(product)}
    </Badge>
  )
}
