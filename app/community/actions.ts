'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { put } from '@vercel/blob'
import { auth } from '@/auth'
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
  RehearsalFormat,
  CastingType,
} from '@/lib/community/types'

export async function requireActiveUser() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userRecords = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  const currentUser = userRecords[0]
  if (!currentUser || currentUser.status !== 'active') {
    throw new Error('Forbidden: active account required')
  }

  return currentUser
}

export async function createCommunityPost(formData: FormData) {
  const user = await requireActiveUser()

  const channel = formData.get('channel') as CommunityChannel
  const title = (formData.get('title') as string)?.trim()
  const content = (formData.get('content') as string)?.trim()

  if (!channel || !title || !content) {
    return { error: 'Channel, title, and content are required' }
  }

  const validChannels: CommunityChannel[] = ['reader_sos', 'callboard', 'craft_chat', 'general']
  if (!validChannels.includes(channel)) {
    return { error: 'Invalid community channel' }
  }

  let rehearsalAt: Date | null = null
  let rehearsalFormat: RehearsalFormat | null = null
  let sceneDetails: string | null = null

  if (channel === 'reader_sos') {
    const rawRehearsalAt = formData.get('rehearsalAt') as string
    if (rawRehearsalAt) {
      const parsed = new Date(rawRehearsalAt)
      if (!isNaN(parsed.getTime())) {
        rehearsalAt = parsed
      }
    }
    const rawFormat = formData.get('rehearsalFormat') as RehearsalFormat
    if (rawFormat === 'studio' || rawFormat === 'online') {
      rehearsalFormat = rawFormat
    }
    const rawSceneDetails = (formData.get('sceneDetails') as string)?.trim()
    if (rawSceneDetails) {
      sceneDetails = rawSceneDetails
    }
  }

  let castingType: CastingType | null = null
  let deadlineAt: Date | null = null

  if (channel === 'callboard') {
    const rawCastingType = formData.get('castingType') as CastingType
    const validCastingTypes: CastingType[] = ['student_film', 'theatre', 'feature', 'commercial', 'crew_rec']
    if (validCastingTypes.includes(rawCastingType)) {
      castingType = rawCastingType
    }
    const rawDeadlineAt = formData.get('deadlineAt') as string
    if (rawDeadlineAt) {
      const parsed = new Date(rawDeadlineAt)
      if (!isNaN(parsed.getTime())) {
        deadlineAt = parsed
      }
    }
  }

  const [createdPost] = await db
    .insert(communityPosts)
    .values({
      channel,
      title,
      content,
      authorId: user.id,
      readerStatus: channel === 'reader_sos' ? 'seeking' : null,
      rehearsalAt,
      rehearsalFormat,
      sceneDetails,
      castingType,
      deadlineAt,
      isPinned: false,
    })
    .returning()

  // Handle uploaded attachments if present
  const files = formData.getAll('attachments')
  for (const item of files) {
    if (item instanceof File && item.size > 0) {
      try {
        const pathname = `community/${createdPost.id}/${Date.now()}-${item.name}`
        const blob = await put(pathname, item, { access: 'public' })
        await db.insert(communityAttachments).values({
          postId: createdPost.id,
          url: blob.url,
          filename: item.name,
          fileType: item.type || 'application/octet-stream',
          fileSize: item.size,
        })
      } catch (err) {
        console.error('Failed to upload community attachment to Vercel Blob:', err)
      }
    }
  }

  revalidatePath('/community')
  return { success: true, postId: createdPost.id }
}

export async function updateReaderStatus(postId: string, status: ReaderStatus) {
  const user = await requireActiveUser()

  const validStatuses: ReaderStatus[] = ['seeking', 'matched', 'closed']
  if (!validStatuses.includes(status)) {
    return { error: 'Invalid status' }
  }

  const [post] = await db
    .select({ id: communityPosts.id, authorId: communityPosts.authorId })
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1)

  if (!post) {
    return { error: 'Post not found' }
  }

  if (post.authorId !== user.id && user.role !== 'admin') {
    return { error: 'Unauthorized to update this post' }
  }

  await db
    .update(communityPosts)
    .set({ readerStatus: status, updatedAt: new Date() })
    .where(eq(communityPosts.id, postId))

  revalidatePath('/community')
  revalidatePath(`/community/${postId}`)
  return { success: true }
}

export async function addCommunityComment(postId: string, content: string) {
  const user = await requireActiveUser()

  const trimmed = content?.trim()
  if (!trimmed) {
    return { error: 'Comment cannot be empty' }
  }

  const [post] = await db
    .select({ id: communityPosts.id })
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1)

  if (!post) {
    return { error: 'Post not found' }
  }

  const [comment] = await db
    .insert(communityComments)
    .values({
      postId,
      authorId: user.id,
      content: trimmed,
    })
    .returning()

  revalidatePath(`/community/${postId}`)
  revalidatePath('/community')
  return { success: true, commentId: comment.id }
}

export async function deleteCommunityPost(postId: string) {
  const user = await requireActiveUser()

  const [post] = await db
    .select({ id: communityPosts.id, authorId: communityPosts.authorId })
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1)

  if (!post) {
    return { error: 'Post not found' }
  }

  if (post.authorId !== user.id && user.role !== 'admin') {
    return { error: 'Unauthorized to delete this post' }
  }

  await db.delete(communityPosts).where(eq(communityPosts.id, postId))

  revalidatePath('/community')
  return { success: true }
}
