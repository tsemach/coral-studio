'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/database'
import { communityPosts, readerOffers, rehearsalSessions } from '@/lib/database/schema'
import { requireActiveUser } from '@/lib/community/auth'
import { mintRehearsalToken, getLiveKitServerUrl } from '@/lib/community/rehearsal-live'
import { getDictionary } from '@/lib/i18n/get-dictionary'

export async function offerToRead(postId: string) {
  const user = await requireActiveUser()
  const { community: t } = await getDictionary()

  const [post] = await db
    .select({
      id: communityPosts.id,
      channel: communityPosts.channel,
      authorId: communityPosts.authorId,
      readerStatus: communityPosts.readerStatus,
    })
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1)

  if (!post) {
    return { error: t.actions.postNotFound }
  }
  if (post.channel !== 'reader_sos' || post.readerStatus !== 'seeking') {
    return { error: t.actions.offerToRead.notOpen }
  }
  if (post.authorId === user.id) {
    return { error: t.actions.offerToRead.ownPost }
  }

  await db.insert(readerOffers).values({ postId, userId: user.id }).onConflictDoNothing()

  revalidatePath(`/community/${postId}`)
  return { success: true as const }
}

export async function confirmReader(postId: string, userId: string) {
  const user = await requireActiveUser()
  const { community: t } = await getDictionary()

  const [post] = await db
    .select({ id: communityPosts.id, authorId: communityPosts.authorId })
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1)

  if (!post) {
    return { error: t.actions.postNotFound }
  }
  if (post.authorId !== user.id && user.role !== 'admin') {
    return { error: t.actions.confirmReader.unauthorized }
  }

  const [offer] = await db
    .select({ id: readerOffers.id })
    .from(readerOffers)
    .where(and(eq(readerOffers.postId, postId), eq(readerOffers.userId, userId)))
    .limit(1)

  if (!offer) {
    return { error: t.actions.confirmReader.noOffer }
  }

  await db
    .update(communityPosts)
    .set({ matchedUserId: userId, readerStatus: 'matched', updatedAt: new Date() })
    .where(eq(communityPosts.id, postId))

  revalidatePath('/community')
  revalidatePath(`/community/${postId}`)
  return { success: true as const }
}

export async function getRehearsalToken(postId: string) {
  const user = await requireActiveUser()
  const { community: t } = await getDictionary()

  const [post] = await db
    .select({
      id: communityPosts.id,
      channel: communityPosts.channel,
      readerStatus: communityPosts.readerStatus,
      authorId: communityPosts.authorId,
      matchedUserId: communityPosts.matchedUserId,
    })
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1)

  if (!post || post.channel !== 'reader_sos' || post.readerStatus !== 'matched' || !post.matchedUserId) {
    return { error: t.actions.rehearsalToken.notAvailable }
  }
  if (user.id !== post.authorId && user.id !== post.matchedUserId) {
    return { error: t.actions.rehearsalToken.unauthorized }
  }

  const token = await mintRehearsalToken(postId, user.id, user.name ?? 'Member')

  // Only the reader's join counts toward their karma -- the author joining
  // their own request isn't "reading for someone."
  if (user.id === post.matchedUserId) {
    await db.insert(rehearsalSessions).values({ postId, readerId: user.id, authorId: post.authorId })
  }

  return { token, serverUrl: getLiveKitServerUrl() }
}
