'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { offerToRead, confirmReader } from '@/app/community/rehearsal-actions'
import { communityKeys } from '@/lib/community/query-keys'
import type { CommunityPostDetailDTO } from '@/lib/community/dto'

export function useOfferToRead(postId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const result = await offerToRead(postId)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: communityKeys.offers(postId) }),
  })
}

export function useConfirmReader(postId: string) {
  const queryClient = useQueryClient()
  const detailKey = communityKeys.postDetail(postId)

  return useMutation({
    mutationFn: async (userId: string) => {
      const result = await confirmReader(postId, userId)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueryData<CommunityPostDetailDTO>(detailKey)
      if (previous) {
        queryClient.setQueryData(detailKey, { ...previous, matchedUserId: userId, readerStatus: 'matched' as const })
      }
      return { previous }
    },
    onError: (_err, _userId, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: detailKey })
      queryClient.invalidateQueries({ queryKey: communityKeys.offers(postId) })
      queryClient.invalidateQueries({ queryKey: communityKeys.posts() })
    },
  })
}
