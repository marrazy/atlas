import { Component, Suspense, type ReactNode } from 'react'
import { ErrorNotice } from '@/components/ErrorNotice'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PAGE_ERROR_MESSAGE, PAGE_FILE_MESSAGE, isPageFileError } from '@/lib/page-errors'

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
 * Any other error while showing the page gets a plain message and the same button.
 */
class PageLoadBoundary extends Component<BoundaryProps, { error: unknown }> {
  state = { error: null as unknown }

  static getDerivedStateFromError(error: unknown) {
    return { error: error ?? new Error('Unknown error') }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorNotice message={isPageFileError(this.state.error) ? PAGE_FILE_MESSAGE : PAGE_ERROR_MESSAGE} />
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
