import { getMobileUser } from '@/lib/mobile-auth'
import { listActiveUsers } from '@/lib/workshops/queries'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUsers = await listActiveUsers()
  return Response.json(activeUsers)
})
