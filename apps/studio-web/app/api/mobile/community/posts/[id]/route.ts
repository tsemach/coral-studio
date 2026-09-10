import { eq } from 'drizzle-orm'
import { getMobileUser } from '@/lib/mobile-auth'
import { getCommunityPostById } from '@/lib/community/queries'
import { toPostDetailDTO } from '@/lib/community/dto'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'
import { db } from '@/lib/database'
import { communityPosts } from '@/lib/database/schema'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const post = await getCommunityPostById(id)
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json(toPostDetailDTO(post))
})

export const DELETE = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: postId } = await params
  const post = await getCommunityPostById(postId)
  if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 })

  if (post.authorId !== user.userId && activeUser.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  await db.delete(communityPosts).where(eq(communityPosts.id, postId))

  return Response.json({ success: true })
})
