import { DatabaseIcon } from 'lucide-react'
import { Link, NavLink, useMatch } from 'react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { DATA_CREDIT, SITE_NAME } from '@/config'
import type { Snapshot } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { formatMonth } from '@/lib/format'
import { AppLogo } from './AppLogo'
import { NAV_ITEMS, type NavItem } from './nav'

function NavMenuItem({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const active = useMatch({ path: item.to, end: item.end ?? false }) !== null
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        className="h-10 gap-2.5 rounded-lg px-2.5 text-muted-foreground data-active:text-sidebar-accent-foreground"
      >
        <NavLink to={item.to} end={item.end} onClick={onNavigate}>
          <Icon aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SnapshotCard({ snapshot }: { snapshot: ApiState<Snapshot> }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[10px] border bg-card p-3">
      <p className="flex items-center gap-2 text-[13px] font-medium">
        <DatabaseIcon aria-hidden="true" className="size-3.5" />
        Data snapshot
      </p>
      <p className="text-xs leading-normal text-muted-foreground">
        {snapshot.status === 'ready' && `Production up to ${formatMonth(snapshot.data.last_month, 'long')}. `}
        {DATA_CREDIT}
      </p>
    </div>
  )
}

export function AppSidebar({ snapshot }: { snapshot: ApiState<Snapshot> }) {
  const { setOpenMobile } = useSidebar()
  const closeOnPhone = () => setOpenMobile(false)

  return (
    <Sidebar>
      <SidebarHeader className="px-3 pt-4">
        <Link to="/" onClick={closeOnPhone} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
          <AppLogo />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">{SITE_NAME}</span>
            <span className="text-xs text-muted-foreground">Norwegian shelf</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 pt-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2.5 text-xs text-muted-foreground">Explore</SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Main">
              <SidebarMenu className="gap-0.5">
                {NAV_ITEMS.map((item) => (
                  <NavMenuItem key={item.to} item={item} onNavigate={closeOnPhone} />
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4">
        <SnapshotCard snapshot={snapshot} />
      </SidebarFooter>
    </Sidebar>
  )
}
