import { and, eq, inArray, count } from 'drizzle-orm'
import { db } from '@/lib/database'
import { readerOffers, rehearsalSessions, users } from '@/lib/database/schema'
import type { ReaderOfferItem } from './types'

export async function listOffersForPost(postId: string): Promise<ReaderOfferItem[]> {
  const rows = await db
    .select({
      id: readerOffers.id,
      userId: readerOffers.userId,
      userName: users.name,
      userImage: users.image,
      createdAt: readerOffers.createdAt,
    })
    .from(readerOffers)
    .innerJoin(users, eq(readerOffers.userId, users.id))
    .where(eq(readerOffers.postId, postId))
    .orderBy(readerOffers.createdAt)

  if (rows.length === 0) return []

  const userIds = rows.map((row) => row.userId)
  const sessionCounts = await db
    .select({ readerId: rehearsalSessions.readerId, count: count(rehearsalSessions.id) })
    .from(rehearsalSessions)
    .where(inArray(rehearsalSessions.readerId, userIds))
    .groupBy(rehearsalSessions.readerId)

  const sessionCountMap = new Map<string, number>()
  for (const row of sessionCounts) {
    sessionCountMap.set(row.readerId, Number(row.count))
  }

  return rows.map((row) => ({ ...row, sessionsRead: sessionCountMap.get(row.userId) ?? 0 }))
}

export async function hasUserOfferedToRead(postId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: readerOffers.id })
    .from(readerOffers)
    .where(and(eq(readerOffers.postId, postId), eq(readerOffers.userId, userId)))
    .limit(1)

  return !!row
}
