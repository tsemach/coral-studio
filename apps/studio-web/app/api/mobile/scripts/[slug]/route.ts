import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { getScript } from '@/lib/workshops/scripts'
import { listWorkshopsForUser } from '@/lib/workshops/queries'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params

  const isAdmin = await isAdminUser(user.userId)
  if (!isAdmin) {
    const mine = await listWorkshopsForUser(user.userId, false)
    if (!mine.some((workshop) => workshop.scriptSlug === slug)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const script = await getScript(slug)
  if (!script) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json(script)
}
