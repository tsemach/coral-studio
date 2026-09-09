import type {
  CommunityPostItem,
  CommunityPostDetail,
  CommentWithAuthor,
  ReaderOfferItem,
} from './types'

export type CommunityPostItemDTO = Omit<
  CommunityPostItem,
  'createdAt' | 'updatedAt' | 'rehearsalAt' | 'deadlineAt'
> & {
  createdAt: string
  updatedAt: string
  rehearsalAt: string | null
  deadlineAt: string | null
}

export function toPostItemDTO(post: CommunityPostItem): CommunityPostItemDTO {
  return {
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    rehearsalAt: post.rehearsalAt?.toISOString() ?? null,
    deadlineAt: post.deadlineAt?.toISOString() ?? null,
  }
}

export type CommunityAttachmentItemDTO = Omit<CommunityPostDetail['attachments'][number], 'createdAt'> & {
  createdAt: string
}

export type CommunityPostDetailDTO = CommunityPostItemDTO & {
  attachments: CommunityAttachmentItemDTO[]
}

export function toPostDetailDTO(post: CommunityPostDetail): CommunityPostDetailDTO {
  return {
    ...toPostItemDTO(post),
    attachments: post.attachments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
  }
}

export type CommentWithAuthorDTO = Omit<CommentWithAuthor, 'createdAt'> & { createdAt: string }

export function toCommentDTO(comment: CommentWithAuthor): CommentWithAuthorDTO {
  return { ...comment, createdAt: comment.createdAt.toISOString() }
}

export type ReaderOfferItemDTO = Omit<ReaderOfferItem, 'createdAt'> & { createdAt: string }

export function toOfferDTO(offer: ReaderOfferItem): ReaderOfferItemDTO {
  return { ...offer, createdAt: offer.createdAt.toISOString() }
}
