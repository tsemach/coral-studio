import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/database'
import { users, workshopMembers, workshops } from '@/lib/database/schema'

export type WorkshopListItem = {
  id: string
  title: string
  scriptSlug: string | null
  rehearsalAt: Date | null
  location: 'studio' | 'online' | null
  memberCount: number
  memberUserIds: string[]
}

export type WorkshopMember = {
  id: string
  userId: string
  name: string | null
  email: string
  type: 'viewer' | 'actor'
  part: string | null
}

export type WorkshopDetail = {
  id: string
  title: string
  scriptSlug: string | null
  rehearsalAt: Date | null
  location: 'studio' | 'online' | null
  meetingUrl: string | null
  createdById: string
  members: WorkshopMember[]
}

export type AddableUser = { id: string; name: string | null; email: string }

// One query feeding both memberCount and the AddMemberDialog/WorkshopFormDialog
// pickers' exclusion list (WorkshopCardMenu filters activeUsers by these ids
// before handing them down) -- memberCount is just .length, no separate
// count() aggregate needed.
async function memberUserIdsByWorkshop(workshopIds: string[]): Promise<Map<string, string[]>> {
  if (workshopIds.length === 0) return new Map()

  const rows = await db
    .select({ workshopId: workshopMembers.workshopId, userId: workshopMembers.userId })
    .from(workshopMembers)
    .where(inArray(workshopMembers.workshopId, workshopIds))

  const map = new Map<string, string[]>()
  for (const row of rows) {
    const existing = map.get(row.workshopId)
    if (existing) existing.push(row.userId)
    else map.set(row.workshopId, [row.userId])
  }
  return map
}

// Attribute 9: admins see every workshop, everyone else only the ones they belong to.
export async function listWorkshopsForUser(userId: string, isAdmin: boolean): Promise<WorkshopListItem[]> {
  const rows = isAdmin
    ? await db
        .select({
          id: workshops.id,
          title: workshops.title,
          scriptSlug: workshops.scriptSlug,
          rehearsalAt: workshops.rehearsalAt,
          location: workshops.location,
        })
        .from(workshops)
        .orderBy(desc(workshops.createdAt))
    : await db
        .select({
          id: workshops.id,
          title: workshops.title,
          scriptSlug: workshops.scriptSlug,
          rehearsalAt: workshops.rehearsalAt,
          location: workshops.location,
        })
        .from(workshops)
        .innerJoin(workshopMembers, eq(workshopMembers.workshopId, workshops.id))
        .where(eq(workshopMembers.userId, userId))
        .orderBy(desc(workshops.createdAt))

  const memberIdsByWorkshop = await memberUserIdsByWorkshop(rows.map((row) => row.id))
  return rows.map((row) => {
    const memberUserIds = memberIdsByWorkshop.get(row.id) ?? []
    return { ...row, memberUserIds, memberCount: memberUserIds.length }
  })
}

export async function getWorkshopDetail(workshopId: string): Promise<WorkshopDetail | null> {
  const [workshop] = await db
    .select({
      id: workshops.id,
      title: workshops.title,
      scriptSlug: workshops.scriptSlug,
      rehearsalAt: workshops.rehearsalAt,
      location: workshops.location,
      meetingUrl: workshops.meetingUrl,
      createdById: workshops.createdById,
    })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1)

  if (!workshop) return null

  const members = await db
    .select({
      id: workshopMembers.id,
      userId: workshopMembers.userId,
      name: users.name,
      email: users.email,
      type: workshopMembers.type,
      part: workshopMembers.part,
    })
    .from(workshopMembers)
    .innerJoin(users, eq(users.id, workshopMembers.userId))
    .where(eq(workshopMembers.workshopId, workshopId))
    .orderBy(workshopMembers.createdAt)

  return { ...workshop, members }
}

// Feeds AddMemberDialog's picker -- every active user, so the caller can see
// and pick rather than having to already know someone's exact email.
export async function listActiveUsers(): Promise<AddableUser[]> {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.status, 'active'))
    .orderBy(users.name, users.email)
}

// Shared by app/workshops/actions.ts's requireMember() guard (PR-2 onward) and
// the [id]/page.tsx not-authorized redirect.
export async function isWorkshopMember(workshopId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: workshopMembers.id })
    .from(workshopMembers)
    .where(and(eq(workshopMembers.workshopId, workshopId), eq(workshopMembers.userId, userId)))
    .limit(1)
  return !!row
}

// COR-18: feeds getLiveToken()'s canPublish decision -- a narrower query than
// getWorkshopDetail() since minting a token only needs this one caller's
// type, not the whole group.
export async function getMemberType(workshopId: string, userId: string): Promise<'viewer' | 'actor' | null> {
  const [row] = await db
    .select({ type: workshopMembers.type })
    .from(workshopMembers)
    .where(and(eq(workshopMembers.workshopId, workshopId), eq(workshopMembers.userId, userId)))
    .limit(1)
  return row?.type ?? null
}
