import { useSyncExternalStore } from 'react'

/** At this width and below, charts use their phone layout. It is the width where Tailwind's `sm:` styles stop. */
export const COMPACT_MAX_WIDTH = 639

const query = `(max-width: ${COMPACT_MAX_WIDTH}px)`

function subscribe(onChange: () => void) {
  const list = window.matchMedia(query)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

// reads innerWidth rather than the media query's answer, like the sidebar does, so tests can set the width
const isCompact = () => window.innerWidth <= COMPACT_MAX_WIDTH

/** True on a phone-sized screen, and it updates when the screen is turned or resized. */
export function useCompact(): boolean {
  return useSyncExternalStore(subscribe, isCompact, () => false)
}
