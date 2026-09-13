import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/database'
import { users, workshopMembers } from '@/lib/database/schema'
import { listAvailableScripts } from '@/lib/workshops/scripts'

export type DraftMember = { userId: string; type: 'actor' | 'viewer'; part: string }

export function isDraftMember(value: unknown): value is DraftMember {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.userId === 'string' &&
    (candidate.type === 'actor' || candidate.type === 'viewer') &&
    typeof candidate.part === 'string'
  )
}

// Mirrors resolveScriptSlug() in app/workshops/actions.ts -- '' / null /
// undefined means "no script."
export async function resolveScriptSlugForMobile(raw: string | null | undefined): Promise<string | null> {
  const scriptSlug = (raw ?? '').trim()
  if (!scriptSlug) return null

  const available = await listAvailableScripts()
  if (!available.some((script) => script.slug === scriptSlug)) {
    throw new Error('Unknown script.')
  }
  return scriptSlug
}

// Mirrors insertValidatedMembers() in app/workshops/actions.ts. Re-validates
// against the DB (active status) -- a JSON body is as directly postable as
// a Server Action's FormData, so the same re-check applies.
export async function insertValidatedMembersForMobile(
  workshopId: string,
  draftMembers: DraftMember[],
  excludeUserId: string
): Promise<void> {
  const filtered = draftMembers.filter((member) => member.userId !== excludeUserId)
  if (filtered.length === 0) return

  const requestedIds = filtered.map((member) => member.userId)
  const validIds = new Set(
    (
      await db
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.id, requestedIds), eq(users.status, 'active')))
    ).map((row) => row.id)
  )

  const rows = filtered
    .filter((member) => validIds.has(member.userId))
    .map((member) => ({
      workshopId,
      userId: member.userId,
      type: member.type,
      part: member.part.trim() || null,
    }))
  if (rows.length === 0) return

  await db.insert(workshopMembers).values(rows).onConflictDoNothing()
}
