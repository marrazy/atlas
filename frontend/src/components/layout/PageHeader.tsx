import type { ReactNode } from 'react'

export function PageHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-2">
      <h1 className="text-[28px] leading-tight font-bold tracking-heading">{title}</h1>
      {description && <p className="max-w-[640px] text-sm leading-normal text-muted-foreground">{description}</p>}
    </div>
  )
}
