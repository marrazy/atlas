import type { ReactNode } from 'react'
import { CREDIT_LINE } from '@/config'

/** The line under every page. It credits the data, or gives the page's own note when that note credits it too. */
export function PageFooter({ children = CREDIT_LINE }: { children?: ReactNode }) {
  return <footer className="mt-6 text-xs leading-[18px] text-muted-foreground">{children}</footer>
}
