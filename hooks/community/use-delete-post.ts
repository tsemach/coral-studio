'use client'

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { deleteCommunityPost } from '@/app/community/actions'
import { communityKeys } from '@/lib/community/query-keys'
import type { PostsPage } from './use-community-posts'

export function useDeletePost() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (postId: string) => {
      const result = await deleteCommunityPost(postId)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: communityKeys.posts() })
      const previousQueries = queryClient.getQueriesData<InfiniteData<PostsPage>>({
        queryKey: communityKeys.posts(),
      })

      queryClient.setQueriesData<InfiniteData<PostsPage>>({ queryKey: communityKeys.posts() }, (old) =>
        old && {
          ...old,
          pages: old.pages.map((page) => ({ ...page, items: page.items.filter((p) => p.id !== postId) })),
        }
      )
      return { previousQueries }
    },
    onError: (_err, _postId, context) => {
      context?.previousQueries.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSuccess: () => router.push('/community'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: communityKeys.posts() }),
  })
}
