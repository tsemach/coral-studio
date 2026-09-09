import { auth } from '@/auth'
import { listCommentsForPost } from '@/lib/community/queries'
import { toCommentDTO } from '@/lib/community/dto'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const comments = await listCommentsForPost(id)
  return Response.json(comments.map(toCommentDTO))
}
