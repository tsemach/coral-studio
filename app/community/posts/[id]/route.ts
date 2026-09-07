import { auth } from '@/auth'
import { getCommunityPostById } from '@/lib/community/queries'
import { toPostDetailDTO } from '@/lib/community/dto'
import { getDictionary } from '@/lib/i18n/get-dictionary'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { community: t } = await getDictionary()
  if (!session?.user?.id) return Response.json({ error: t.api.unauthorized }, { status: 401 })

  const { id } = await params
  const post = await getCommunityPostById(id)
  if (!post) return Response.json({ error: t.api.notFound }, { status: 404 })
  return Response.json(toPostDetailDTO(post))
}
