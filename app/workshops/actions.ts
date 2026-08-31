'use server'

import { and, eq } from 'drizzle-orm'
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

// Attribute 5: the creator is added to the group in the same call, so
// membership -- not creatorship -- is what every other action gates on.
export async function createWorkshop() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const [workshop] = await db
    .insert(workshops)
    .values({ createdById: session.user.id })
    .returning({ id: workshops.id })

  await db.insert(workshopMembers).values({
    workshopId: workshop.id,
    userId: session.user.id,
    type: 'actor',
  })

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
