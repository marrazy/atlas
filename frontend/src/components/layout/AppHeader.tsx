import { CodeIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { SOURCE_CODE_URL } from '@/config'
import { pageLabel } from './nav'

export function AppHeader() {
  const { pathname } = useLocation()

  return (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b bg-page px-4 py-2 sm:px-8">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-text-2">
          <li>
            <Link to="/" className="rounded-sm hover:text-foreground">
              Atlas
            </Link>
          </li>
          <li aria-hidden="true" className="text-muted-foreground">
            /
          </li>
          <li>
            <span aria-current="page" className="text-foreground">
              {pageLabel(pathname)}
            </span>
          </li>
        </ol>
      </nav>
      <Button asChild variant="outline" className="h-8 gap-2 px-3 text-[13px]">
        <a href={SOURCE_CODE_URL}>
          <CodeIcon aria-hidden="true" strokeWidth={1.5} className="text-text-2" />
          Source code
        </a>
      </Button>
    </header>
  )
}
