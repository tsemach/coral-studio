'use client'

import { useQuery } from '@tanstack/react-query'

export function useLiveStatus(workshopId: string) {
  return useQuery({
    // TODO(workshops plan): migrate to workshopKeys.liveStatus(workshopId) once
    // lib/workshops/query-keys.ts exists -- that factory's key root is plural
    // ('workshops'), different from this inline one, so this must be a
    // migration (replace this key), not an addition alongside it.
    queryKey: ['workshop', workshopId, 'live'] as const,
    queryFn: async () => {
      const res = await fetch(`/workshops/${workshopId}/live-status`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch live status')
      return (await res.json()) as { live: boolean }
    },
    refetchInterval: 8000,
    staleTime: 0,
  })
}
