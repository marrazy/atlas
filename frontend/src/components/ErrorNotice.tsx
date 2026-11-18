import { CircleAlertIcon, RotateCcwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  message: string
  /** Shows a "Try again" button that loads the data again. */
  onRetry?: () => void
}

export function ErrorNotice({ message, onRetry }: Props) {
  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 rounded-xl border border-destructive/40 bg-card p-4 text-sm">
      <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
      <p className="min-w-0 flex-[1_1_200px]">{message}</p>
      {onRetry && (
        <Button variant="outline" className="h-9 px-3" onClick={onRetry}>
          <RotateCcwIcon aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}
