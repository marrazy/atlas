import { useOutletContext } from 'react-router'
import type { Snapshot } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'

/** The snapshot the layout already loaded, so pages do not ask the API for it again. */
export function useSnapshot(): ApiState<Snapshot> {
  return useOutletContext<ApiState<Snapshot>>()
}
