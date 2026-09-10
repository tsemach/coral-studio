import { and, count, eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { workshops, workshopMembers } from '@/lib/database/schema'
import { getMobileUser } from '@/lib/mobile-auth'
import { isWorkshopMember } from '@/lib/workshops/queries'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const POST = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const isMember = await isWorkshopMember(workshopId, user.userId)
  if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  const [row] = await db
    .select({ memberCount: count() })
    .from(workshopMembers)
    .where(eq(workshopMembers.workshopId, workshopId))

  if ((row?.memberCount ?? 0) <= 1) {
    await db.delete(workshops).where(eq(workshops.id, workshopId))
  } else {
    await db
      .delete(workshopMembers)
      .where(and(eq(workshopMembers.workshopId, workshopId), eq(workshopMembers.userId, user.userId)))
  }

  return Response.json({ success: true })
})
