'use client'

import { useQuery } from '@tanstack/react-query'
import { communityKeys } from '@/lib/community/query-keys'
import type { CommunityPostDetailDTO, CommentWithAuthorDTO, ReaderOfferItemDTO } from '@/lib/community/dto'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${url}`)
  return res.json()
}

export function usePostDetail(postId: string) {
  return useQuery({
    queryKey: communityKeys.postDetail(postId),
    queryFn: () => fetchJson<CommunityPostDetailDTO>(`/community/posts/${postId}`),
  })
}

export function usePostComments(postId: string) {
  return useQuery({
    queryKey: communityKeys.comments(postId),
    queryFn: () => fetchJson<CommentWithAuthorDTO[]>(`/community/posts/${postId}/comments`),
  })
}

export function usePostOffers(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: communityKeys.offers(postId),
    queryFn: () =>
      fetchJson<{ offers: ReaderOfferItemDTO[]; hasOffered: boolean }>(`/community/posts/${postId}/offers`),
    enabled,
  })
}
