import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { listWorkshopsForUser, getWorkshopDetail } from '@/lib/workshops/queries'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'
import { workshops, workshopMembers } from '@/lib/database/schema'
import { db } from '@/lib/database'
import {
  resolveScriptSlugForMobile,
  insertValidatedMembersForMobile,
  isDraftMember,
  type DraftMember,
} from '@/lib/workshops/mobile-write-helpers'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = await isAdminUser(user.userId)
  const list = await listWorkshopsForUser(user.userId, isAdmin)
  return Response.json(list)
})

export const POST = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''

  let scriptSlug: string | null
  try {
    scriptSlug = await resolveScriptSlugForMobile(typeof body?.scriptSlug === 'string' ? body.scriptSlug : null)
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown script.' }, { status: 400 })
  }

  const rawMembers = Array.isArray(body?.members) ? body.members : []
  const members: DraftMember[] = rawMembers.filter(isDraftMember)

  const [workshop] = await db
    .insert(workshops)
    .values({
      ...(title ? { title } : {}),
      scriptSlug,
      createdById: user.userId,
    })
    .returning({ id: workshops.id })

  await db.insert(workshopMembers).values({ workshopId: workshop.id, userId: user.userId, type: 'actor' })
  await insertValidatedMembersForMobile(workshop.id, members, user.userId)

  const detail = await getWorkshopDetail(workshop.id)
  return Response.json(detail, { status: 201 })
})
