import { desc, eq, inArray, count } from 'drizzle-orm'
import { db } from '@/lib/database'
import { tapePosts, tapeNotes, users } from '@/lib/database/schema'
import type { TapeItem, TapeNoteItem, TapeNoteTag } from './tape-types'

const TAPE_COLUMNS = {
  id: tapePosts.id,
  title: tapePosts.title,
  description: tapePosts.description,
  authorId: tapePosts.authorId,
  authorName: users.name,
  authorImage: users.image,
  authorRole: users.role,
  durationSeconds: tapePosts.durationSeconds,
  createdAt: tapePosts.createdAt,
}

export async function listTapes(): Promise<TapeItem[]> {
  const rows = await db
    .select(TAPE_COLUMNS)
    .from(tapePosts)
    .innerJoin(users, eq(tapePosts.authorId, users.id))
    .orderBy(desc(tapePosts.createdAt))

  if (rows.length === 0) return []

  const tapeIds = rows.map((row) => row.id)
  const noteCounts = await db
    .select({ tapeId: tapeNotes.tapeId, count: count(tapeNotes.id) })
    .from(tapeNotes)
    .where(inArray(tapeNotes.tapeId, tapeIds))
    .groupBy(tapeNotes.tapeId)

  const noteCountMap = new Map<string, number>()
  for (const row of noteCounts) {
    noteCountMap.set(row.tapeId, Number(row.count))
  }

  return rows.map((row) => ({ ...row, notesCount: noteCountMap.get(row.id) ?? 0 }))
}

export async function getTapeById(id: string): Promise<TapeItem | null> {
  const rows = await db
    .select(TAPE_COLUMNS)
    .from(tapePosts)
    .innerJoin(users, eq(tapePosts.authorId, users.id))
    .where(eq(tapePosts.id, id))
    .limit(1)

  if (rows.length === 0) return null
  const row = rows[0]

  const [countResult] = await db
    .select({ count: count(tapeNotes.id) })
    .from(tapeNotes)
    .where(eq(tapeNotes.tapeId, id))

  return { ...row, notesCount: Number(countResult?.count ?? 0) }
}

export async function listNotesForTape(tapeId: string): Promise<TapeNoteItem[]> {
  const rows = await db
    .select({
      id: tapeNotes.id,
      tapeId: tapeNotes.tapeId,
      authorId: tapeNotes.authorId,
      authorName: users.name,
      authorImage: users.image,
      authorRole: users.role,
      timestampSeconds: tapeNotes.timestampSeconds,
      tag: tapeNotes.tag,
      content: tapeNotes.content,
      createdAt: tapeNotes.createdAt,
    })
    .from(tapeNotes)
    .innerJoin(users, eq(tapeNotes.authorId, users.id))
    .where(eq(tapeNotes.tapeId, tapeId))
    .orderBy(tapeNotes.timestampSeconds)

  return rows.map((row) => ({ ...row, tag: row.tag as TapeNoteTag | null }))
}

export async function getTapeVideoPathname(id: string): Promise<string | null> {
  const [row] = await db
    .select({ videoPathname: tapePosts.videoPathname })
    .from(tapePosts)
    .where(eq(tapePosts.id, id))
    .limit(1)

  return row?.videoPathname ?? null
}
