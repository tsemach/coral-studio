import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { workshops } from '@/lib/database/schema'
import { getMobileUser } from '@/lib/mobile-auth'
import { isWorkshopMember, getWorkshopDetail } from '@/lib/workshops/queries'
import { deleteRehearsalEvent, getValidAccessToken, upsertRehearsalEvent } from '@/lib/google/calendar'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

const REHEARSAL_DURATION_MS = 2 * 60 * 60 * 1000

export const PUT = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const isMember = await isWorkshopMember(workshopId, user.userId)
  if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const raw = typeof body?.rehearsalAt === 'string' ? body.rehearsalAt : ''
  const rehearsalAt = raw ? new Date(raw) : null
  const location = body?.location === 'online' ? 'online' : 'studio'
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

  if (body?.syncCalendar === true) {
    const accessToken = await getValidAccessToken(user.userId)
    if (accessToken) {
      if (!rehearsalAt) {
        if (existing?.googleEventId) await deleteRehearsalEvent(accessToken, existing.googleEventId)
      } else {
        const detail = await getWorkshopDetail(workshopId)
        if (detail) {
          const attendeeEmails = detail.members
            .filter((member) => member.type === 'actor' && member.userId !== user.userId)
            .map((member) => member.email)

          const result = await upsertRehearsalEvent(accessToken, existing?.googleEventId ?? null, {
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
      }
    }
  }

  const detail = await getWorkshopDetail(workshopId)
  return Response.json(detail)
})

export const DELETE = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const isMember = await isWorkshopMember(workshopId, user.userId)
  if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 401 })

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
    const accessToken = await getValidAccessToken(user.userId)
    if (accessToken) {
      const result = await deleteRehearsalEvent(accessToken, existing.googleEventId)
      if (result) console.error(`[calendar] failed to cancel rehearsal event for workshop ${workshopId}: ${result.error}`)
    }
  }

  const detail = await getWorkshopDetail(workshopId)
  return Response.json(detail)
})
