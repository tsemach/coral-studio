import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { tapePosts, tapeNotes } from '@/lib/database/schema'
import { getMobileUser } from '@/lib/mobile-auth'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { listNotesForTape } from '@/lib/community/tape-queries'
import { toTapeNoteDTO, type TapeNoteTag } from '@coral-studio/types'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

const VALID_TAGS: TapeNoteTag[] = [
  'objective_action',
  'truthfulness_listening',
  'vocal_physicality',
  'framing_eyeline',
]

export const GET = withMobileCors(async (request: Request, { params }: { params: Promise<{ tapeId: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { tapeId } = await params
  const notes = await listNotesForTape(tapeId)
  return Response.json(notes.map(toTapeNoteDTO))
})

export const POST = withMobileCors(async (request: Request, { params }: { params: Promise<{ tapeId: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { tapeId } = await params
  const body = await request.json().catch(() => null)
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  const timestampSeconds = body?.timestampSeconds
  const tag = body?.tag === null || body?.tag === undefined ? null : (body.tag as TapeNoteTag)

  if (!content) return Response.json({ error: 'Note cannot be empty.' }, { status: 400 })
  if (!Number.isInteger(timestampSeconds) || timestampSeconds < 0) {
    return Response.json({ error: 'Invalid timestamp.' }, { status: 400 })
  }
  if (tag !== null && !VALID_TAGS.includes(tag)) {
    return Response.json({ error: 'Unknown tag.' }, { status: 400 })
  }

  const [tape] = await db.select({ id: tapePosts.id }).from(tapePosts).where(eq(tapePosts.id, tapeId)).limit(1)
  if (!tape) return Response.json({ error: 'Tape not found.' }, { status: 404 })

  const [inserted] = await db
    .insert(tapeNotes)
    .values({ tapeId, authorId: user.userId, timestampSeconds, tag, content })
    .returning({ id: tapeNotes.id, timestampSeconds: tapeNotes.timestampSeconds, tag: tapeNotes.tag, content: tapeNotes.content, createdAt: tapeNotes.createdAt })

  return Response.json(
    toTapeNoteDTO({
      id: inserted.id,
      tapeId,
      authorId: user.userId,
      authorName: activeUser.name,
      authorImage: activeUser.image,
      authorRole: activeUser.role,
      timestampSeconds: inserted.timestampSeconds,
      tag: inserted.tag as TapeNoteTag | null,
      content: inserted.content,
      createdAt: inserted.createdAt,
    }),
    { status: 201 }
  )
})
