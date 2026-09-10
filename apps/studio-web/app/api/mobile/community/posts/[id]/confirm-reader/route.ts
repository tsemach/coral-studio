import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { communityPosts, readerOffers } from '@/lib/database/schema'
import { getMobileUser } from '@/lib/mobile-auth'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const POST = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: postId } = await params
  const body = await request.json().catch(() => null)
  const readerId = typeof body?.userId === 'string' ? body.userId : ''
  if (!readerId) return Response.json({ error: 'Missing userId.' }, { status: 400 })

  const [post] = await db
    .select({ id: communityPosts.id, authorId: communityPosts.authorId })
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1)
  if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 })

  if (post.authorId !== user.userId && activeUser.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const [offer] = await db
    .select({ id: readerOffers.id })
    .from(readerOffers)
    .where(and(eq(readerOffers.postId, postId), eq(readerOffers.userId, readerId)))
    .limit(1)
  if (!offer) return Response.json({ error: 'That user has not offered to read this.' }, { status: 400 })

  await db
    .update(communityPosts)
    .set({ matchedUserId: readerId, readerStatus: 'matched', updatedAt: new Date() })
    .where(eq(communityPosts.id, postId))

  return Response.json({ success: true })
})
