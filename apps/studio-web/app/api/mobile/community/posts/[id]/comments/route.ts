import { eq } from 'drizzle-orm'
import { getMobileUser } from '@/lib/mobile-auth'
import { listCommentsForPost } from '@/lib/community/queries'
import { toCommentDTO } from '@/lib/community/dto'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'
import { db } from '@/lib/database'
import { communityComments, communityPosts, users } from '@/lib/database/schema'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const comments = await listCommentsForPost(id)
  return Response.json(comments.map(toCommentDTO))
})

export const POST = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: postId } = await params
  const body = await request.json().catch(() => null)
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  if (!content) return Response.json({ error: 'Comment cannot be empty.' }, { status: 400 })

  const [post] = await db.select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.id, postId)).limit(1)
  if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 })

  const [author] = await db
    .select({ name: users.name, image: users.image, role: users.role })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1)
  if (!author) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [comment] = await db
    .insert(communityComments)
    .values({ postId, authorId: user.userId, content })
    .returning()

  return Response.json(
    toCommentDTO({
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      authorName: author.name,
      authorImage: author.image,
      authorRole: author.role,
      content: comment.content,
      createdAt: comment.createdAt,
    }),
    { status: 201 }
  )
})
