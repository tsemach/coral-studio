'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { addCommunityComment } from '@/app/community/actions'
import { communityKeys } from '@/lib/community/query-keys'
import type { CommentWithAuthorDTO } from '@/lib/community/dto'

export function useAddComment(postId: string) {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const queryKey = communityKeys.comments(postId)

  return useMutation({
    mutationFn: async (content: string) => {
      const result = await addCommunityComment(postId, content)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<CommentWithAuthorDTO[]>(queryKey)

      if (session?.user) {
        const optimistic: CommentWithAuthorDTO = {
          id: `optimistic-${Date.now()}`,
          postId,
          authorId: session.user.id as string,
          authorName: session.user.name ?? null,
          authorImage: session.user.image ?? null,
          authorRole: (session.user as { role?: string }).role ?? 'member',
          content,
          createdAt: new Date().toISOString(),
        }
        queryClient.setQueryData(queryKey, (old: CommentWithAuthorDTO[] = []) => [...old, optimistic])
      }
      return { previous }
    },
    onError: (_err, _content, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: communityKeys.posts() })
    },
  })
}
