export type CommunityChannel = 'reader_sos' | 'callboard' | 'craft_chat' | 'general'
export type ReaderStatus = 'seeking' | 'matched' | 'closed'
export type RehearsalFormat = 'studio' | 'online'
export type CastingType = 'student_film' | 'theatre' | 'feature' | 'commercial' | 'crew_rec'

export interface CommunityPostItem {
  id: string
  channel: CommunityChannel
  title: string
  content: string
  authorId: string
  authorName: string | null
  authorImage: string | null
  authorRole: string
  readerStatus: ReaderStatus | null
  matchedUserId: string | null
  matchedUserName: string | null
  rehearsalAt: Date | null
  rehearsalFormat: RehearsalFormat | null
  sceneDetails: string | null
  castingType: CastingType | null
  deadlineAt: Date | null
  isPinned: boolean
  createdAt: Date
  updatedAt: Date
  commentsCount: number
}

export interface CommunityAttachmentItem {
  id: string
  postId: string | null
  commentId: string | null
  url: string
  filename: string
  fileType: string
  fileSize: number | null
  createdAt: Date
}

export interface CommunityPostDetail extends CommunityPostItem {
  attachments: CommunityAttachmentItem[]
}

export interface CommentWithAuthor {
  id: string
  postId: string
  authorId: string
  authorName: string | null
  authorImage: string | null
  authorRole: string
  content: string
  createdAt: Date
}

export interface ReaderOfferItem {
  id: string
  userId: string
  userName: string | null
  userImage: string | null
  sessionsRead: number
  createdAt: Date
}

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
