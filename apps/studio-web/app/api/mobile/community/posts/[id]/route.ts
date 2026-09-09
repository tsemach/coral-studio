import { getMobileUser } from '@/lib/mobile-auth'
import { getCommunityPostById } from '@/lib/community/queries'
import { toPostDetailDTO } from '@/lib/community/dto'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const post = await getCommunityPostById(id)
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json(toPostDetailDTO(post))
}
