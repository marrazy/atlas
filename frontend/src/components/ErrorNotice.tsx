import { CircleAlertIcon } from 'lucide-react'

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-card p-4 text-sm">
      <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
      <p>{message}</p>
    </div>
  )
}
