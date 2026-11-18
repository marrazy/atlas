import { Link, NavLink } from 'react-router'
import { SITE_NAME } from '@/config'
import type { Snapshot } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { formatMonth } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AppLogo } from './AppLogo'
import { NAV_ITEMS } from './nav'

function SnapshotFooter({ snapshot }: { snapshot: ApiState<Snapshot> }) {
  return (
    <div className="mt-6 flex flex-col gap-1 border-t border-sidebar-line px-2.5 pt-4 md:mt-auto">
      <span className="text-xs text-sidebar-muted">Data snapshot</span>
      {snapshot.status === 'ready' && (
        <span className="text-[13px] text-sidebar-text-2">Production to {formatMonth(snapshot.data.last_month)}</span>
      )}
      <span className="text-xs leading-normal text-sidebar-muted">
        Sodir FactPages, Norwegian Licence for Open Government Data
      </span>
    </div>
  )
}

/** The dark sidebar from design v2, section 3. On narrow screens it sits above the content. */
export function AppSidebar({ snapshot }: { snapshot: ApiState<Snapshot> }) {
  return (
    <aside
      data-surface="dark"
      className="flex w-full flex-col bg-sidebar px-3 py-5 text-sidebar-text md:sticky md:top-0 md:h-svh md:w-[248px] md:shrink-0"
    >
      <Link to="/" className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sidebar-text">
        <AppLogo />
        <span className="text-[15px] font-medium">{SITE_NAME}</span>
      </Link>
      <nav aria-label="Main" className="mt-6 flex flex-col gap-0.5">
        <span className="px-2.5 pb-2 text-xs text-sidebar-muted">Explore</span>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors hover:bg-sidebar-active hover:text-sidebar-text',
                isActive ? 'bg-sidebar-active text-sidebar-text' : 'text-sidebar-text-2',
              )
            }
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <SnapshotFooter snapshot={snapshot} />
    </aside>
  )
}
