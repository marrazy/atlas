import type { ReactNode } from 'react'

/** The title block. Design v2 has no page subtitles, so it is the page title only. */
export function PageHeader({ title }: { title: ReactNode }) {
  return <h1 className="mb-6 text-[28px] leading-[1.15] font-medium">{title}</h1>
}
