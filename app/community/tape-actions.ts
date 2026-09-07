'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { del } from '@vercel/blob'
import { db } from '@/lib/database'
import { tapePosts, tapeNotes } from '@/lib/database/schema'
import { requireActiveUser } from '@/lib/community/auth'
import { getDictionary } from '@/lib/i18n/get-dictionary'
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
  const { community: t } = await getDictionary()

  const title = input.title.trim()
  const description = input.description.trim()

  if (!title || !description || !input.videoPathname) {
    return { error: t.actions.createTape.missingFields }
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
  const { community: t } = await getDictionary()

  const trimmed = content?.trim()
  if (!trimmed) {
    return { error: t.actions.addTapeNote.empty }
  }
  if (!Number.isInteger(timestampSeconds) || timestampSeconds < 0) {
    return { error: t.actions.addTapeNote.invalidTimestamp }
  }
  if (tag !== null && !VALID_TAGS.includes(tag)) {
    return { error: t.actions.addTapeNote.invalidTag }
  }

  const [tape] = await db
    .select({ id: tapePosts.id })
    .from(tapePosts)
    .where(eq(tapePosts.id, tapeId))
    .limit(1)

  if (!tape) {
    return { error: t.actions.tapeNotFound }
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
  const { community: t } = await getDictionary()

  const [tape] = await db
    .select({ id: tapePosts.id, authorId: tapePosts.authorId, videoPathname: tapePosts.videoPathname })
    .from(tapePosts)
    .where(eq(tapePosts.id, tapeId))
    .limit(1)

  if (!tape) {
    return { error: t.actions.tapeNotFound }
  }

  if (tape.authorId !== user.id && user.role !== 'admin') {
    return { error: t.actions.deleteTape.unauthorized }
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
