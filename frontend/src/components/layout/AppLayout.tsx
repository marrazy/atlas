import type { CSSProperties } from 'react'
import { Outlet, useLocation } from 'react-router'
import { SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DATA_CREDIT } from '@/config'
import { getSnapshot } from '@/lib/api/client'
import { useApi } from '@/lib/api/use-api'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { PageLoader } from './PageLoader'

// The design has no button to bring a hidden sidebar back on desktop, so it always stays open there.
// On phones the sidebar is a slide-out panel with its own open state.
const keepOpen = () => {}

export function AppLayout() {
  const snapshot = useApi('snapshot', (signal) => getSnapshot({ signal }))
  const { pathname } = useLocation()

  return (
    <TooltipProvider>
      <SidebarProvider open onOpenChange={keepOpen} style={{ '--sidebar-width': '15rem' } as CSSProperties}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <AppSidebar snapshot={snapshot} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader snapshot={snapshot} />
          <main id="main" tabIndex={-1} className="w-full max-w-[1240px] flex-1 p-6 outline-none">
            <PageLoader resetKey={pathname}>
              <Outlet context={snapshot} />
            </PageLoader>
          </main>
          <footer className="border-t px-6 py-4 text-xs leading-normal text-muted-foreground md:hidden">
            {DATA_CREDIT}
          </footer>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}
