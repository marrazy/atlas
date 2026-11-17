import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = { label: string; icon: LucideIcon; onClick: () => void; pressed?: boolean }

/** A small icon button for a chart card, like "Reset view" or "Save as image". */
export function ChartToolButton({ label, icon: Icon, onClick, pressed }: Props) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      className="size-8 text-muted-foreground hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground"
    >
      <Icon aria-hidden="true" />
    </Button>
  )
}
