import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { communityPosts } from '@/lib/database/schema'
import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'
import type { ReaderStatus } from '@coral-studio/types'

export const OPTIONS = mobileCorsPreflight

export const PATCH = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: postId } = await params
  const body = await request.json().catch(() => null)
  const status = body?.status as ReaderStatus
  const validStatuses: ReaderStatus[] = ['seeking', 'matched', 'closed']
  if (!validStatuses.includes(status)) {
    return Response.json({ error: 'Unknown status.' }, { status: 400 })
  }

  const [post] = await db
    .select({ id: communityPosts.id, authorId: communityPosts.authorId })
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1)
  if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 })

  const isAdmin = await isAdminUser(user.userId)
  if (post.authorId !== user.userId && !isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await db
    .update(communityPosts)
    .set({ readerStatus: status, matchedUserId: status === 'matched' ? undefined : null, updatedAt: new Date() })
    .where(eq(communityPosts.id, postId))

  return Response.json({ success: true })
})
