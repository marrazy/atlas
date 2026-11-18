import { useEffect, useEffectEvent } from 'react'
import { Outlet, useLocation } from 'react-router'
import { getSnapshot } from '@/lib/api/client'
import { useApi } from '@/lib/api/use-api'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { PageLoader } from './PageLoader'

export function AppLayout() {
  const snapshot = useApi('snapshot', (signal) => getSnapshot({ signal }))
  const { pathname } = useLocation()

  // the snapshot date is loaded once for every screen, so if that failed, moving to another screen tries again
  const retrySnapshot = useEffectEvent(() => {
    if (snapshot.status === 'error') snapshot.retry?.()
  })
  useEffect(() => retrySnapshot(), [pathname])

  return (
    <div className="flex min-h-svh flex-col bg-page md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <AppSidebar snapshot={snapshot} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main id="main" tabIndex={-1} className="w-full max-w-[1280px] flex-1 p-4 outline-none sm:p-8">
          <PageLoader resetKey={pathname}>
            <Outlet context={snapshot} />
          </PageLoader>
        </main>
      </div>
    </div>
  )
}
