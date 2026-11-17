import { ChartLineIcon, LayersIcon, MapIcon, type LucideIcon } from 'lucide-react'
import { matchPath } from 'react-router'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** True when only this exact path counts as active (the home page). */
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Shelf map', icon: MapIcon, end: true },
  { to: '/fields', label: 'Field deep dive', icon: ChartLineIcon },
  { to: '/lifecycles', label: 'Field lifecycles', icon: LayersIcon },
]

export const NOT_FOUND_LABEL = 'Page not found'

/** The screen name for an address, as shown in the breadcrumb. */
export function pageLabel(pathname: string): string {
  const item = NAV_ITEMS.find(({ to, end = false }) => matchPath({ path: to, end }, pathname))
  return item?.label ?? NOT_FOUND_LABEL
}
