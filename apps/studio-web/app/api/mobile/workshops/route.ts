import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { listWorkshopsForUser } from '@/lib/workshops/queries'

export async function GET(request: Request) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = await isAdminUser(user.userId)
  const list = await listWorkshopsForUser(user.userId, isAdmin)
  return Response.json(list)
}
