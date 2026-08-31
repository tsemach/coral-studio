'use server'

import { and, count, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/database'
import { users, workshopMembers, workshops } from '@/lib/database/schema'
import { isWorkshopMember } from '@/lib/workshops/queries'
import { listAvailableScripts } from '@/lib/workshops/scripts'
import { isValidEmail } from '@/lib/validation'

// Render-time gating on the page is not a security boundary -- a Server
// Action is directly POSTable, so every action re-checks the caller is a
// signed-in member of the workshop, mirroring requireAdmin() in
// app/admin/users/actions.ts. Exported so PR-3 onward's actions in this file
// can share it.
export async function requireMember(workshopId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const member = await isWorkshopMember(workshopId, session.user.id)
  if (!member) throw new Error('Unauthorized')

  return session.user as { id: string }
}

type DraftMember = { userId: string; type: 'actor' | 'viewer'; part: string }

function parseDraftMembers(raw: string): DraftMember[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed.filter((m): m is DraftMember => {
    if (typeof m !== 'object' || m === null) return false
    const candidate = m as Record<string, unknown>
    return (
      typeof candidate.userId === 'string' &&
      (candidate.type === 'actor' || candidate.type === 'viewer') &&
      typeof candidate.part === 'string'
    )
  })
}

// Attribute 5: the creator is added to the group in the same call, so
// membership -- not creatorship -- is what every other action gates on.
// Backs the "New workshop" modal (create-workshop-dialog.tsx): title and a
// script are optional (attribute 4 -- a workshop can still be created empty
// and filled in later), and so are additional members picked at creation.
export async function createWorkshop(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const title = String(formData.get('title') ?? '').trim()

  const scriptSlugRaw = String(formData.get('scriptSlug') ?? '').trim()
  let scriptSlug: string | null = null
  if (scriptSlugRaw) {
    const available = await listAvailableScripts()
    if (!available.some((script) => script.slug === scriptSlugRaw)) {
      throw new Error('Unknown script')
    }
    scriptSlug = scriptSlugRaw
  }

  // Re-validated against the DB, not trusted from the client -- the modal
  // only ever offers users from listActiveUsers(), but a Server Action is
  // directly POSTable, so this can't assume the request came from that UI.
  const draftMembers = parseDraftMembers(String(formData.get('members') ?? '[]')).filter(
    (member) => member.userId !== session.user!.id
  )
  const requestedIds = draftMembers.map((member) => member.userId)
  const validIds = requestedIds.length
    ? new Set(
        (
          await db
            .select({ id: users.id })
            .from(users)
            .where(and(inArray(users.id, requestedIds), eq(users.status, 'active')))
        ).map((row) => row.id)
      )
    : new Set<string>()

  const [workshop] = await db
    .insert(workshops)
    .values({
      ...(title ? { title } : {}),
      scriptSlug,
      createdById: session.user.id,
    })
    .returning({ id: workshops.id })

  await db
    .insert(workshopMembers)
    .values([
      { workshopId: workshop.id, userId: session.user.id, type: 'actor' as const },
      ...draftMembers
        .filter((member) => validIds.has(member.userId))
        .map((member) => ({
          workshopId: workshop.id,
          userId: member.userId,
          type: member.type,
          part: member.part.trim() || null,
        })),
    ])
    .onConflictDoNothing()

  revalidatePath('/workshops')
  redirect(`/workshops/${workshop.id}`)
}

// Attribute 6: any member (not just the creator) can add any other existing,
// active user -- no invite-by-email, matching attribute 2a's "userId or user
// name (a unique identifier)."
export async function addMember(workshopId: string, formData: FormData) {
  await requireMember(workshopId)

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const type = formData.get('type') === 'viewer' ? 'viewer' : 'actor'
  const part = String(formData.get('part') ?? '').trim() || null

  if (!isValidEmail(email)) throw new Error('Enter a valid email address')

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), eq(users.status, 'active')))
    .limit(1)

  if (!target) throw new Error('No active user found with that email')

  await db.insert(workshopMembers).values({ workshopId, userId: target.id, type, part }).onConflictDoNothing()

  revalidatePath(`/workshops/${workshopId}`)
}

export async function removeMember(workshopId: string, memberId: string) {
  await requireMember(workshopId)

  await db
    .delete(workshopMembers)
    .where(and(eq(workshopMembers.id, memberId), eq(workshopMembers.workshopId, workshopId)))

  revalidatePath(`/workshops/${workshopId}`)
}

export async function updateMember(workshopId: string, memberId: string, formData: FormData) {
  await requireMember(workshopId)

  const type = formData.get('type') === 'viewer' ? 'viewer' : 'actor'
  const part = String(formData.get('part') ?? '').trim() || null

  await db
    .update(workshopMembers)
    .set({ type, part })
    .where(and(eq(workshopMembers.id, memberId), eq(workshopMembers.workshopId, workshopId)))

  revalidatePath(`/workshops/${workshopId}`)
}

export async function setRehearsalDate(workshopId: string, formData: FormData) {
  await requireMember(workshopId)

  const raw = String(formData.get('rehearsalAt') ?? '')
  const rehearsalAt = raw ? new Date(raw) : null

  await db.update(workshops).set({ rehearsalAt }).where(eq(workshops.id, workshopId))

  revalidatePath(`/workshops/${workshopId}`)
}

// Script *editing* is out of scope for COR-12 (workshops-spec.md) -- this
// only attaches one of the pre-made scripts under workshops/scripts/.
export async function setWorkshopScript(workshopId: string, formData: FormData) {
  await requireMember(workshopId)

  const scriptSlug = String(formData.get('scriptSlug') ?? '').trim()
  if (scriptSlug) {
    const available = await listAvailableScripts()
    if (!available.some((script) => script.slug === scriptSlug)) {
      throw new Error('Unknown script')
    }
  }

  await db
    .update(workshops)
    .set({ scriptSlug: scriptSlug || null })
    .where(eq(workshops.id, workshopId))

  revalidatePath(`/workshops/${workshopId}`)
}

async function memberCountOf(workshopId: string): Promise<number> {
  const [row] = await db
    .select({ memberCount: count() })
    .from(workshopMembers)
    .where(eq(workshopMembers.workshopId, workshopId))
  return row?.memberCount ?? 0
}

// Design decision (docs/workshops/design.md): leaving as the last member
// deletes the workshop rather than leaving an orphaned, member-less row --
// attribute 8 already implies a workshop shouldn't be able to sit at zero
// members.
export async function leaveWorkshop(workshopId: string) {
  const member = await requireMember(workshopId)

  if ((await memberCountOf(workshopId)) <= 1) {
    await db.delete(workshops).where(eq(workshops.id, workshopId))
  } else {
    await db
      .delete(workshopMembers)
      .where(and(eq(workshopMembers.workshopId, workshopId), eq(workshopMembers.userId, member.id)))
  }

  revalidatePath('/workshops')
  redirect('/workshops')
}

// Attribute 8: only when the caller is the last member. The card menu only
// ever shows Delete in that state (Leave otherwise), but this re-asserts it
// server-side regardless of what the UI sent.
export async function deleteWorkshop(workshopId: string) {
  await requireMember(workshopId)

  if ((await memberCountOf(workshopId)) > 1) {
    throw new Error('Leave the workshop instead -- delete only works once you are the last member')
  }

  await db.delete(workshops).where(eq(workshops.id, workshopId))

  revalidatePath('/workshops')
  redirect('/workshops')
}
