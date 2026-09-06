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
