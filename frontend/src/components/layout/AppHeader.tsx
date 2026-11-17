import { CalendarIcon, CodeIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { SOURCE_CODE_URL } from '@/config'
import type { Snapshot } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { formatMonth } from '@/lib/format'
import { pageLabel } from './nav'

function SnapshotBadge({ snapshot }: { snapshot: ApiState<Snapshot> }) {
  const label =
    snapshot.status === 'ready' ? `Snapshot · ${formatMonth(snapshot.data.last_month)}` : 'Snapshot'

  return (
    <Badge variant="outline" className="h-6 gap-1.5 px-2.5">
      <CalendarIcon aria-hidden="true" />
      {label}
    </Badge>
  )
}

export function AppHeader({ snapshot }: { snapshot: ApiState<Snapshot> }) {
  const { pathname } = useLocation()

  return (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b px-6 py-2">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-2 size-9 md:hidden" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Atlas</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{pageLabel(pathname)}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SnapshotBadge snapshot={snapshot} />
        <Button asChild variant="outline" className="h-9 gap-2 px-3 text-[13px]">
          <a href={SOURCE_CODE_URL}>
            <CodeIcon aria-hidden="true" />
            Source code
          </a>
        </Button>
      </div>
    </header>
  )
}
