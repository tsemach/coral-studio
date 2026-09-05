'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { del } from '@vercel/blob'
import { db } from '@/lib/database'
import { tapePosts, tapeNotes } from '@/lib/database/schema'
import { requireActiveUser } from '@/lib/community/auth'
import type { TapeNoteTag } from '@/lib/community/tape-types'

const VALID_TAGS: TapeNoteTag[] = [
  'objective_action',
  'truthfulness_listening',
  'vocal_physicality',
  'framing_eyeline',
]

export async function createTape(input: {
  title: string
  description: string
  videoPathname: string
  durationSeconds: number | null
}) {
  const user = await requireActiveUser()

  const title = input.title.trim()
  const description = input.description.trim()

  if (!title || !description || !input.videoPathname) {
    return { error: 'Title, description, and a video are required' }
  }

  const [createdTape] = await db
    .insert(tapePosts)
    .values({
      title,
      description,
      authorId: user.id,
      videoPathname: input.videoPathname,
      durationSeconds: input.durationSeconds,
    })
    .returning()

  revalidatePath('/community')
  return { success: true as const, tapeId: createdTape.id }
}

export async function addTapeNote(
  tapeId: string,
  timestampSeconds: number,
  content: string,
  tag: TapeNoteTag | null
) {
  const user = await requireActiveUser()

  const trimmed = content?.trim()
  if (!trimmed) {
    return { error: 'Note cannot be empty' }
  }
  if (!Number.isInteger(timestampSeconds) || timestampSeconds < 0) {
    return { error: 'Invalid timestamp' }
  }
  if (tag !== null && !VALID_TAGS.includes(tag)) {
    return { error: 'Invalid tag' }
  }

  const [tape] = await db
    .select({ id: tapePosts.id })
    .from(tapePosts)
    .where(eq(tapePosts.id, tapeId))
    .limit(1)

  if (!tape) {
    return { error: 'Tape not found' }
  }

  const [note] = await db
    .insert(tapeNotes)
    .values({
      tapeId,
      authorId: user.id,
      timestampSeconds,
      tag,
      content: trimmed,
    })
    .returning()

  revalidatePath(`/community/tape-room/${tapeId}`)
  revalidatePath('/community')
  return { success: true as const, noteId: note.id }
}

export async function deleteTape(tapeId: string) {
  const user = await requireActiveUser()

  const [tape] = await db
    .select({ id: tapePosts.id, authorId: tapePosts.authorId, videoPathname: tapePosts.videoPathname })
    .from(tapePosts)
    .where(eq(tapePosts.id, tapeId))
    .limit(1)

  if (!tape) {
    return { error: 'Tape not found' }
  }

  if (tape.authorId !== user.id && user.role !== 'admin') {
    return { error: 'Unauthorized to delete this tape' }
  }

  await db.delete(tapePosts).where(eq(tapePosts.id, tapeId))

  try {
    await del(tape.videoPathname, { token: process.env.BLOB_READ_WRITE_TOKEN })
  } catch {
    // The DB row is already gone -- the tape is deleted from the user's
    // perspective either way. An orphaned blob is a cleanup concern, not a
    // reason to fail the delete.
  }

  revalidatePath('/community')
  return { success: true as const }
}
