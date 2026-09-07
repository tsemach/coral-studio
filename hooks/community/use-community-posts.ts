'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { communityKeys } from '@/lib/community/query-keys'
import { encodeCursor, type PostsCursor } from '@/lib/community/pagination'
import type { CommunityPostItemDTO } from '@/lib/community/dto'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

export interface PostsPage {
  // isOptimistic is never present in a server response -- only Task 8's
  // useCreatePost writes it, into this same cache entry, before settle.
  items: (CommunityPostItemDTO & { isOptimistic?: boolean })[]
  nextCursor: PostsCursor | null
}

async function fetchPostsPage(
  channel: CommunityChannel | undefined,
  status: ReaderStatus | undefined,
  cursor: PostsCursor | null
): Promise<PostsPage> {
  const params = new URLSearchParams()
  if (channel) params.set('channel', channel)
  if (status) params.set('status', status)
  if (cursor) params.set('cursor', encodeCursor(cursor))

  const res = await fetch(`/community/posts?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to load posts')
  return res.json()
}

export function useCommunityPosts(channel?: CommunityChannel, status?: ReaderStatus) {
  return useInfiniteQuery({
    queryKey: communityKeys.postsList(channel, status),
    queryFn: ({ pageParam }) => fetchPostsPage(channel, status, pageParam),
    initialPageParam: null as PostsCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}
