import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { workshopMembers } from '@/lib/database/schema'
import { getMobileUser } from '@/lib/mobile-auth'
import { isWorkshopMember, getWorkshopDetail } from '@/lib/workshops/queries'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const DELETE = withMobileCors(
  async (request: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) => {
    const user = await getMobileUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: workshopId, memberId } = await params
    const isMember = await isWorkshopMember(workshopId, user.userId)
    if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 403 })

    await db
      .delete(workshopMembers)
      .where(and(eq(workshopMembers.id, memberId), eq(workshopMembers.workshopId, workshopId)))

    const detail = await getWorkshopDetail(workshopId)
    return Response.json(detail)
  }
)

export const PATCH = withMobileCors(
  async (request: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) => {
    const user = await getMobileUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: workshopId, memberId } = await params
    const isMember = await isWorkshopMember(workshopId, user.userId)
    if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 403 })

    const body = await request.json().catch(() => null)
    const type = body?.type === 'viewer' ? 'viewer' : 'actor'
    const part = typeof body?.part === 'string' ? body.part.trim() || null : null

    await db
      .update(workshopMembers)
      .set({ type, part })
      .where(and(eq(workshopMembers.id, memberId), eq(workshopMembers.workshopId, workshopId)))

    const detail = await getWorkshopDetail(workshopId)
    return Response.json(detail)
  }
)
