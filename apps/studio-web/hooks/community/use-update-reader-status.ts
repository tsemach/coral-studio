'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateReaderStatus } from '@/app/community/actions'
import { communityKeys } from '@/lib/community/query-keys'
import type { CommunityPostDetailDTO } from '@/lib/community/dto'
import type { ReaderStatus } from '@/lib/community/types'

export function useUpdateReaderStatus(postId: string) {
  const queryClient = useQueryClient()
  const detailKey = communityKeys.postDetail(postId)

  return useMutation({
    mutationFn: async (status: ReaderStatus) => {
      const result = await updateReaderStatus(postId, status)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueryData<CommunityPostDetailDTO>(detailKey)
      if (previous) {
        queryClient.setQueryData(detailKey, {
          ...previous,
          readerStatus: status,
          matchedUserId: status === 'matched' ? previous.matchedUserId : null,
        })
      }
      return { previous }
    },
    onError: (_err, _status, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: detailKey })
      queryClient.invalidateQueries({ queryKey: communityKeys.posts() })
    },
  })
}
