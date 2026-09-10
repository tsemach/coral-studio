import { getMobileUser } from '@/lib/mobile-auth'
import { listAvailableScripts } from '@/lib/workshops/scripts'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const scripts = await listAvailableScripts()
  return Response.json(scripts)
})
