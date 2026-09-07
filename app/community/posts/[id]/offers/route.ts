import { auth } from '@/auth'
import { getCommunityPostById } from '@/lib/community/queries'
import { listOffersForPost, hasUserOfferedToRead } from '@/lib/community/reader-queries'
import { toOfferDTO } from '@/lib/community/dto'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const post = await getCommunityPostById(id)
  if (!post || post.channel !== 'reader_sos') {
    return Response.json({ offers: [], hasOffered: false })
  }

  const isAdmin = (session.user as { role?: string }).role === 'admin'
  const isPostAuthorOrAdmin = post.authorId === session.user.id || isAdmin

  const [offers, hasOffered] = await Promise.all([
    isPostAuthorOrAdmin ? listOffersForPost(id) : Promise.resolve([]),
    !isPostAuthorOrAdmin ? hasUserOfferedToRead(id, session.user.id) : Promise.resolve(false),
  ])

  return Response.json({ offers: offers.map(toOfferDTO), hasOffered })
}
