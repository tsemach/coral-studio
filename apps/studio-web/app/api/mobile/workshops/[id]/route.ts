import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { getWorkshopDetail, isWorkshopMember } from '@/lib/workshops/queries'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'
import { db } from '@/lib/database'
import { eq } from 'drizzle-orm'
import { workshops } from '@/lib/database/schema'
import {
  resolveScriptSlugForMobile,
  insertValidatedMembersForMobile,
  isDraftMember,
  type DraftMember,
} from '@/lib/workshops/mobile-write-helpers'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [member, isAdmin] = await Promise.all([isWorkshopMember(id, user.userId), isAdminUser(user.userId)])
  if (!member && !isAdmin) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  const detail = await getWorkshopDetail(id)
  if (!detail) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json(detail)
})

export const PATCH = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const [isMember, isAdmin] = await Promise.all([isWorkshopMember(workshopId, user.userId), isAdminUser(user.userId)])
  if (!isMember && !isAdmin) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''

  let scriptSlug: string | null
  try {
    scriptSlug = await resolveScriptSlugForMobile(typeof body?.scriptSlug === 'string' ? body.scriptSlug : null)
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown script.' }, { status: 400 })
  }

  await db
    .update(workshops)
    .set({ ...(title ? { title } : {}), scriptSlug })
    .where(eq(workshops.id, workshopId))

  const rawMembers = Array.isArray(body?.members) ? body.members : []
  const members: DraftMember[] = rawMembers.filter(isDraftMember)
  await insertValidatedMembersForMobile(workshopId, members, user.userId)

  const detail = await getWorkshopDetail(workshopId)
  if (!detail) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(detail)
})
