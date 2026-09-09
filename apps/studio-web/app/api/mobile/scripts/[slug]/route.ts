import { getMobileUser } from '@/lib/mobile-auth'
import { getScript } from '@/lib/workshops/scripts'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const script = await getScript(slug)
  if (!script) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json(script)
}
