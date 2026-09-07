'use client'

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { createCommunityPost } from '@/app/community/actions'
import { communityKeys } from '@/lib/community/query-keys'
import type { PostsPage } from './use-community-posts'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

export function useCreatePost(channel: CommunityChannel | undefined, status: ReaderStatus | undefined) {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const queryKey = communityKeys.postsList(channel, status)

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createCommunityPost(formData)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<InfiniteData<PostsPage>>(queryKey)

      if (session?.user && previous) {
        const optimistic: PostsPage['items'][number] = {
          id: `optimistic-${Date.now()}`,
          channel: (formData.get('channel') as CommunityChannel) ?? 'general',
          title: String(formData.get('title') ?? ''),
          content: String(formData.get('content') ?? ''),
          authorId: session.user.id as string,
          authorName: session.user.name ?? null,
          authorImage: session.user.image ?? null,
          authorRole: (session.user as { role?: string }).role ?? 'member',
          readerStatus: null,
          matchedUserId: null,
          matchedUserName: null,
          rehearsalAt: null,
          rehearsalFormat: null,
          sceneDetails: null,
          castingType: null,
          deadlineAt: null,
          isPinned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          commentsCount: 0,
          isOptimistic: true,
        }
        queryClient.setQueryData<InfiniteData<PostsPage>>(queryKey, {
          ...previous,
          pages: [
            { ...previous.pages[0], items: [optimistic, ...previous.pages[0].items] },
            ...previous.pages.slice(1),
          ],
        })
      }
      return { previous }
    },
    onError: (_err, _formData, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: communityKeys.posts() }),
  })
}
