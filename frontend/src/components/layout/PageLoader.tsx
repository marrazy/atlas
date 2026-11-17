import { Component, Suspense, type ReactNode } from 'react'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function PageLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">Loading page</span>
      <Skeleton aria-hidden="true" className="h-8 w-48" />
      <Skeleton aria-hidden="true" className="h-4 w-80 max-w-full" />
    </div>
  )
}

type BoundaryProps = { children: ReactNode }

/**
 * Each screen is its own file, loaded when first opened. After a new release, an open tab can ask
 * for a file that no longer exists, so this shows a way to reload instead of a blank page.
 */
class PageLoadBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorNotice message="This page could not load. The site may have been updated since you opened it." />
        <Button variant="outline" className="h-10 px-3" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
    )
  }
}

/** Shows a placeholder while a screen's file loads. `resetKey` clears an error when the visitor moves to another screen. */
export function PageLoader({ children, resetKey }: { children: ReactNode; resetKey: string }) {
  return (
    <PageLoadBoundary key={resetKey}>
      <Suspense fallback={<PageLoading />}>{children}</Suspense>
    </PageLoadBoundary>
  )
}
