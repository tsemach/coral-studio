import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { isWorkshopMember } from '@/lib/workshops/queries'
import { isWorkshopLive } from '@/lib/workshops/live'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [member, isAdmin] = await Promise.all([isWorkshopMember(id, user.userId), isAdminUser(user.userId)])
  if (!member && !isAdmin) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  const live = await isWorkshopLive(id)
  return Response.json({ live })
})
