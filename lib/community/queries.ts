import { and, desc, eq, inArray, count } from 'drizzle-orm'
import { db } from '@/lib/database'
import {
  communityPosts,
  communityComments,
  communityAttachments,
  users,
} from '@/lib/database/schema'
import type {
  CommunityChannel,
  ReaderStatus,
  CommunityPostItem,
  CommunityPostDetail,
  CommentWithAuthor,
} from './types'

export async function listCommunityPosts(
  channel?: CommunityChannel,
  status?: ReaderStatus
): Promise<CommunityPostItem[]> {
  const conditions = []
  if (channel) {
    conditions.push(eq(communityPosts.channel, channel))
  }
  if (status) {
    conditions.push(eq(communityPosts.readerStatus, status))
  }

  const query = db
    .select({
      id: communityPosts.id,
      channel: communityPosts.channel,
      title: communityPosts.title,
      content: communityPosts.content,
      authorId: communityPosts.authorId,
      authorName: users.name,
      authorImage: users.image,
      authorRole: users.role,
      readerStatus: communityPosts.readerStatus,
      rehearsalAt: communityPosts.rehearsalAt,
      rehearsalFormat: communityPosts.rehearsalFormat,
      sceneDetails: communityPosts.sceneDetails,
      castingType: communityPosts.castingType,
      deadlineAt: communityPosts.deadlineAt,
      isPinned: communityPosts.isPinned,
      createdAt: communityPosts.createdAt,
      updatedAt: communityPosts.updatedAt,
    })
    .from(communityPosts)
    .innerJoin(users, eq(communityPosts.authorId, users.id))

  const rows = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt))
    : await query.orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt))

  if (rows.length === 0) return []

  const postIds = rows.map((r) => r.id)
  const commentCounts = await db
    .select({
      postId: communityComments.postId,
      count: count(communityComments.id),
    })
    .from(communityComments)
    .where(inArray(communityComments.postId, postIds))
    .groupBy(communityComments.postId)

  const commentCountMap = new Map<string, number>()
  for (const c of commentCounts) {
    commentCountMap.set(c.postId, Number(c.count))
  }

  return rows.map((row) => ({
    id: row.id,
    channel: row.channel as CommunityChannel,
    title: row.title,
    content: row.content,
    authorId: row.authorId,
    authorName: row.authorName,
    authorImage: row.authorImage,
    authorRole: row.authorRole,
    readerStatus: row.readerStatus as ReaderStatus | null,
    rehearsalAt: row.rehearsalAt,
    rehearsalFormat: row.rehearsalFormat as CommunityPostItem['rehearsalFormat'],
    sceneDetails: row.sceneDetails,
    castingType: row.castingType as CommunityPostItem['castingType'],
    deadlineAt: row.deadlineAt,
    isPinned: row.isPinned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    commentsCount: commentCountMap.get(row.id) ?? 0,
  }))
}

export async function getCommunityPostById(id: string): Promise<CommunityPostDetail | null> {
  const rows = await db
    .select({
      id: communityPosts.id,
      channel: communityPosts.channel,
      title: communityPosts.title,
      content: communityPosts.content,
      authorId: communityPosts.authorId,
      authorName: users.name,
      authorImage: users.image,
      authorRole: users.role,
      readerStatus: communityPosts.readerStatus,
      rehearsalAt: communityPosts.rehearsalAt,
      rehearsalFormat: communityPosts.rehearsalFormat,
      sceneDetails: communityPosts.sceneDetails,
      castingType: communityPosts.castingType,
      deadlineAt: communityPosts.deadlineAt,
      isPinned: communityPosts.isPinned,
      createdAt: communityPosts.createdAt,
      updatedAt: communityPosts.updatedAt,
    })
    .from(communityPosts)
    .innerJoin(users, eq(communityPosts.authorId, users.id))
    .where(eq(communityPosts.id, id))
    .limit(1)

  if (rows.length === 0) return null
  const row = rows[0]

  const [commentCountResult, attachments] = await Promise.all([
    db
      .select({ count: count(communityComments.id) })
      .from(communityComments)
      .where(eq(communityComments.postId, id)),
    db
      .select({
        id: communityAttachments.id,
        postId: communityAttachments.postId,
        commentId: communityAttachments.commentId,
        url: communityAttachments.url,
        filename: communityAttachments.filename,
        fileType: communityAttachments.fileType,
        fileSize: communityAttachments.fileSize,
        createdAt: communityAttachments.createdAt,
      })
      .from(communityAttachments)
      .where(eq(communityAttachments.postId, id)),
  ])

  return {
    id: row.id,
    channel: row.channel as CommunityChannel,
    title: row.title,
    content: row.content,
    authorId: row.authorId,
    authorName: row.authorName,
    authorImage: row.authorImage,
    authorRole: row.authorRole,
    readerStatus: row.readerStatus as ReaderStatus | null,
    rehearsalAt: row.rehearsalAt,
    rehearsalFormat: row.rehearsalFormat as CommunityPostItem['rehearsalFormat'],
    sceneDetails: row.sceneDetails,
    castingType: row.castingType as CommunityPostItem['castingType'],
    deadlineAt: row.deadlineAt,
    isPinned: row.isPinned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    commentsCount: Number(commentCountResult[0]?.count ?? 0),
    attachments: attachments.map((a) => ({
      id: a.id,
      postId: a.postId,
      commentId: a.commentId,
      url: a.url,
      filename: a.filename,
      fileType: a.fileType,
      fileSize: a.fileSize,
      createdAt: a.createdAt,
    })),
  }
}

export async function listCommentsForPost(postId: string): Promise<CommentWithAuthor[]> {
  const rows = await db
    .select({
      id: communityComments.id,
      postId: communityComments.postId,
      content: communityComments.content,
      createdAt: communityComments.createdAt,
      authorId: communityComments.authorId,
      authorName: users.name,
      authorImage: users.image,
      authorRole: users.role,
    })
    .from(communityComments)
    .innerJoin(users, eq(communityComments.authorId, users.id))
    .where(eq(communityComments.postId, postId))
    .orderBy(communityComments.createdAt)

  return rows.map((r) => ({
    id: r.id,
    postId: r.postId,
    content: r.content,
    createdAt: r.createdAt,
    authorId: r.authorId,
    authorName: r.authorName,
    authorImage: r.authorImage,
    authorRole: r.authorRole,
  }))
}
