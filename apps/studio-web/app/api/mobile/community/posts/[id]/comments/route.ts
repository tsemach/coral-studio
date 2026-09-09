import { getMobileUser } from '@/lib/mobile-auth'
import { listCommentsForPost } from '@/lib/community/queries'
import { toCommentDTO } from '@/lib/community/dto'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const comments = await listCommentsForPost(id)
  return Response.json(comments.map(toCommentDTO))
}
