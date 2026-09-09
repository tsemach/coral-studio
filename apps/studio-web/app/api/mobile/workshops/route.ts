import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { listWorkshopsForUser } from '@/lib/workshops/queries'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = await isAdminUser(user.userId)
  const list = await listWorkshopsForUser(user.userId, isAdmin)
  return Response.json(list)
})
