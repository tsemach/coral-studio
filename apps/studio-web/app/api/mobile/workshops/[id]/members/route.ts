import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { users, workshopMembers } from '@/lib/database/schema'
import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { isWorkshopMember, getWorkshopDetail } from '@/lib/workshops/queries'
import { isValidEmail } from '@/lib/validation'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const POST = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const [isMember, isAdmin] = await Promise.all([isWorkshopMember(workshopId, user.userId), isAdminUser(user.userId)])
  if (!isMember && !isAdmin) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const type = body?.type === 'viewer' ? 'viewer' : 'actor'
  const part = typeof body?.part === 'string' ? body.part.trim() || null : null

  if (!isValidEmail(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), eq(users.status, 'active')))
    .limit(1)

  if (!target) return Response.json({ error: 'No active user found with that email.' }, { status: 404 })

  await db.insert(workshopMembers).values({ workshopId, userId: target.id, type, part }).onConflictDoNothing()

  const detail = await getWorkshopDetail(workshopId)
  return Response.json(detail, { status: 201 })
})
