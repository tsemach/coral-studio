import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { getCommunityPostById } from '@/lib/community/queries'
import { listOffersForPost, hasUserOfferedToRead } from '@/lib/community/reader-queries'
import { toOfferDTO } from '@/lib/community/dto'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const post = await getCommunityPostById(id)
  if (!post || post.channel !== 'reader_sos') {
    return Response.json({ offers: [], hasOffered: false })
  }

  const isAdmin = await isAdminUser(user.userId)
  const isPostAuthorOrAdmin = post.authorId === user.userId || isAdmin

  const [offers, hasOffered] = await Promise.all([
    isPostAuthorOrAdmin ? listOffersForPost(id) : Promise.resolve([]),
    !isPostAuthorOrAdmin ? hasUserOfferedToRead(id, user.userId) : Promise.resolve(false),
  ])

  return Response.json({ offers: offers.map(toOfferDTO), hasOffered })
})
