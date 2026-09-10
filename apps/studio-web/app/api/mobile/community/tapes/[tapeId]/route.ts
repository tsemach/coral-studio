import { eq } from 'drizzle-orm'
import { del } from '@vercel/blob'
import { db } from '@/lib/database'
import { tapePosts } from '@/lib/database/schema'
import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const DELETE = withMobileCors(async (request: Request, { params }: { params: Promise<{ tapeId: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { tapeId } = await params
  const [tape] = await db
    .select({ id: tapePosts.id, authorId: tapePosts.authorId, videoPathname: tapePosts.videoPathname })
    .from(tapePosts)
    .where(eq(tapePosts.id, tapeId))
    .limit(1)
  if (!tape) return Response.json({ error: 'Tape not found.' }, { status: 404 })

  const isAdmin = await isAdminUser(user.userId)
  if (tape.authorId !== user.userId && !isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await db.delete(tapePosts).where(eq(tapePosts.id, tapeId))

  try {
    await del(tape.videoPathname, { token: process.env.BLOB_READ_WRITE_TOKEN })
  } catch {
    // The DB row is already gone -- the tape is deleted from the user's
    // perspective either way. An orphaned blob is a cleanup concern, not a
    // reason to fail the delete.
  }

  return Response.json({ success: true })
})
