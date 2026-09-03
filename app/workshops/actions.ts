'use server'

import { and, count, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/database'
import { users, workshopMembers, workshops } from '@/lib/database/schema'
import { getWorkshopDetail, isWorkshopMember } from '@/lib/workshops/queries'
import { listAvailableScripts } from '@/lib/workshops/scripts'
import { isValidEmail } from '@/lib/validation'
import { deleteRehearsalEvent, getValidAccessToken, upsertRehearsalEvent } from '@/lib/google/calendar'

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

// Same as requireMember(), but an admin passes without needing membership --
// COR-17: admins already see every workshop regardless of membership
// (attribute 9, lib/workshops/queries.ts's listWorkshopsForUser), so being
// able to attach a script to one they're browsing but haven't joined matches
// that same broad-visibility intent. Scoped to setWorkshopScript() only, not
// the rest of this file (adding/removing members, scheduling, leaving,
// deleting) -- those stay member-only unless asked for separately.
async function requireMemberOrAdmin(workshopId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  if ((session.user as { role?: string }).role === 'admin') {
    return session.user as { id: string }
  }

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

// Shared by createWorkshop() and updateWorkshop() -- '' means "no script."
async function resolveScriptSlug(raw: string): Promise<string | null> {
  const scriptSlug = raw.trim()
  if (!scriptSlug) return null

  const available = await listAvailableScripts()
  if (!available.some((script) => script.slug === scriptSlug)) {
    throw new Error('Unknown script')
  }
  return scriptSlug
}

// Shared by createWorkshop() and updateWorkshop(). Re-validated against the
// DB, not trusted from the client -- the New/Edit workshop dialog only ever
// offers users from listActiveUsers(), but a Server Action is directly
// POSTable, so this can't assume the request came from that UI.
async function insertValidatedMembers(workshopId: string, rawMembers: string, excludeUserId: string) {
  const draftMembers = parseDraftMembers(rawMembers).filter((member) => member.userId !== excludeUserId)
  if (draftMembers.length === 0) return

  const requestedIds = draftMembers.map((member) => member.userId)
  const validIds = new Set(
    (
      await db
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.id, requestedIds), eq(users.status, 'active')))
    ).map((row) => row.id)
  )

  const rows = draftMembers
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

// Attribute 5: the creator is added to the group in the same call, so
// membership -- not creatorship -- is what every other action gates on.
// Backs the "New workshop" dialog (workshop-form-dialog.tsx, mode="create"):
// title and a script are optional (attribute 4 -- a workshop can still be
// created empty and filled in later), and so are additional members picked
// at creation.
export async function createWorkshop(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const title = String(formData.get('title') ?? '').trim()
  const scriptSlug = await resolveScriptSlug(String(formData.get('scriptSlug') ?? ''))

  const [workshop] = await db
    .insert(workshops)
    .values({
      ...(title ? { title } : {}),
      scriptSlug,
      createdById: session.user.id,
    })
    .returning({ id: workshops.id })

  await db.insert(workshopMembers).values({ workshopId: workshop.id, userId: session.user.id, type: 'actor' })
  await insertValidatedMembers(workshop.id, String(formData.get('members') ?? '[]'), session.user.id)

  revalidatePath('/workshops')
  redirect(`/workshops/${workshop.id}`)
}

// Backs the same dialog in mode="edit" (workshop-card-menu.tsx's Edit item).
// Unlike createWorkshop(), a blank title leaves the existing one alone
// (silently resetting a real title back to "Untitled workshop" on an
// accidental blank submit would be a worse default than just ignoring it),
// and this never redirects -- Edit can be opened from any card in the
// sidebar, not just the one currently open.
export async function updateWorkshop(workshopId: string, formData: FormData) {
  const member = await requireMember(workshopId)

  const title = String(formData.get('title') ?? '').trim()
  const scriptSlug = await resolveScriptSlug(String(formData.get('scriptSlug') ?? ''))

  await db
    .update(workshops)
    .set({ ...(title ? { title } : {}), scriptSlug })
    .where(eq(workshops.id, workshopId))

  await insertValidatedMembers(workshopId, String(formData.get('members') ?? '[]'), member.id)

  revalidatePath('/workshops')
  revalidatePath(`/workshops/${workshopId}`)
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

const REHEARSAL_DURATION_MS = 2 * 60 * 60 * 1000

// COR-15: best-effort Google Calendar sync on top of the rehearsal date --
// never throws, so a Calendar API hiccup (or the acting member simply not
// having a Google account with calendar access linked) never blocks saving
// the date/location itself. One event, created under the acting member's own
// Google account with every actor added as an attendee (Google emails them
// an invite), rather than writing to each actor's calendar individually.
async function syncRehearsalCalendarEvent(
  workshopId: string,
  actingUserId: string,
  rehearsalAt: Date | null,
  location: 'studio' | 'online',
  meetingUrl: string | null,
  existingGoogleEventId: string | null
) {
  const accessToken = await getValidAccessToken(actingUserId)
  if (!accessToken) return

  if (!rehearsalAt) {
    if (existingGoogleEventId) await deleteRehearsalEvent(accessToken, existingGoogleEventId)
    return
  }

  const detail = await getWorkshopDetail(workshopId)
  if (!detail) return

  const attendeeEmails = detail.members
    .filter((member) => member.type === 'actor' && member.userId !== actingUserId)
    .map((member) => member.email)

  const result = await upsertRehearsalEvent(accessToken, existingGoogleEventId, {
    title: `${detail.title} rehearsal`,
    location,
    meetingUrl,
    start: rehearsalAt,
    end: new Date(rehearsalAt.getTime() + REHEARSAL_DURATION_MS),
    attendeeEmails,
  })

  if ('googleEventId' in result) {
    await db.update(workshops).set({ googleEventId: result.googleEventId }).where(eq(workshops.id, workshopId))
  } else {
    console.error(`[calendar] failed to sync rehearsal event for workshop ${workshopId}: ${result.error}`)
  }
}

export async function setRehearsalDate(workshopId: string, formData: FormData) {
  const member = await requireMember(workshopId)

  const raw = String(formData.get('rehearsalAt') ?? '')
  const rehearsalAt = raw ? new Date(raw) : null
  const location = formData.get('location') === 'online' ? 'online' : 'studio'
  const meetingUrl = rehearsalAt && location === 'online' ? `https://meet.google.com/mock-${workshopId.slice(0, 8)}` : null

  const [existing] = await db
    .select({ googleEventId: workshops.googleEventId })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1)

  await db
    .update(workshops)
    .set({
      rehearsalAt,
      location: rehearsalAt ? location : null,
      meetingUrl,
      ...(rehearsalAt ? {} : { googleEventId: null }),
    })
    .where(eq(workshops.id, workshopId))

  // "Set google calendar" checkbox (schedule-rehearsal-dialog.tsx) --
  // unchecked means the saver explicitly doesn't want this save to touch
  // Google Calendar at all, so the sync call (create/update/delete) is
  // skipped entirely rather than just failing silently on a missing token.
  if (formData.get('syncCalendar') === 'on') {
    await syncRehearsalCalendarEvent(workshopId, member.id, rehearsalAt, location, meetingUrl, existing?.googleEventId ?? null)
  }

  revalidatePath(`/workshops/${workshopId}`)
}

// Backs the "x" on workshop-details-panel.tsx's rehearsal card -- always
// attempts the cancellation notice (unlike setRehearsalDate's checkbox-gated
// sync), since clicking a dedicated cancel control is already an explicit
// signal the caller wants everyone notified. deleteRehearsalEvent's
// sendUpdates=all is what actually emails the cancellation to every
// attendee; best-effort like the rest of the calendar integration, so a
// missing/expired Google token still clears the rehearsal locally.
export async function cancelRehearsal(workshopId: string) {
  const member = await requireMember(workshopId)

  const [existing] = await db
    .select({ googleEventId: workshops.googleEventId })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1)

  await db
    .update(workshops)
    .set({ rehearsalAt: null, location: null, meetingUrl: null, googleEventId: null })
    .where(eq(workshops.id, workshopId))

  if (existing?.googleEventId) {
    const accessToken = await getValidAccessToken(member.id)
    if (accessToken) {
      const result = await deleteRehearsalEvent(accessToken, existing.googleEventId)
      if (result) console.error(`[calendar] failed to cancel rehearsal event for workshop ${workshopId}: ${result.error}`)
    }
  }

  revalidatePath(`/workshops/${workshopId}`)
}

// Script *editing* is out of scope for COR-12 (workshops-spec.md) -- this
// only attaches one of the scripts uploaded via the /scripts admin page,
// stored in Vercel Blob (lib/workshops/scripts.ts).
export async function setWorkshopScript(workshopId: string, formData: FormData) {
  await requireMemberOrAdmin(workshopId)

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
