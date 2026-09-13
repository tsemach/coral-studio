import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { communityPosts, rehearsalSessions } from '@/lib/database/schema'
import { getMobileUser } from '@/lib/mobile-auth'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { getLiveKitServerUrl, mintRehearsalToken } from '@/lib/community/rehearsal-live'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

// Mirrors getRehearsalToken() in app/community/rehearsal-actions.ts, reimplemented
// behind bearer auth: a rehearsal room always has exactly two participants (the
// post's author and the confirmed reader) and both always publish -- no
// promotion flow like Workshops' live-token route.
export const GET = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: postId } = await params

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
    return Response.json({ error: 'Rehearsal not available.' }, { status: 404 })
  }
  if (user.userId !== post.authorId && user.userId !== post.matchedUserId) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const token = await mintRehearsalToken(postId, user.userId, activeUser.name ?? 'Member')

  // Only the reader's join counts toward their karma -- the author joining
  // their own request isn't "reading for someone." Mirrors the web action.
  if (user.userId === post.matchedUserId) {
    await db.insert(rehearsalSessions).values({ postId, readerId: user.userId, authorId: post.authorId })
  }

  return Response.json({ token, serverUrl: getLiveKitServerUrl() })
})
