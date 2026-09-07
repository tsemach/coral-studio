'use client'

import { useQuery } from '@tanstack/react-query'

export function useLiveStatus(workshopId: string) {
  return useQuery({
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
