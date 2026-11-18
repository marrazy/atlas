import { CircleAlertIcon, RotateCcwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  message: string
  /** Shows a "Try again" button that loads the data again. */
  onRetry?: () => void
}

export function ErrorNotice({ message, onRetry }: Props) {
  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 rounded-lg border bg-card p-4 text-[13px] text-text-2">
      <CircleAlertIcon aria-hidden="true" strokeWidth={1.5} className="mt-0.5 size-4 shrink-0 text-foreground" />
      <p className="min-w-0 flex-[1_1_200px]">{message}</p>
      {onRetry && (
        <Button variant="outline" className="h-8 px-3 text-[13px]" onClick={onRetry}>
          <RotateCcwIcon aria-hidden="true" strokeWidth={1.5} />
          Try again
        </Button>
      )}
    </div>
  )
}
