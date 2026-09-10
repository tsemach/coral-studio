import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { getCommunityPostById } from '@/lib/community/queries'
import { listOffersForPost, hasUserOfferedToRead } from '@/lib/community/reader-queries'
import { toOfferDTO } from '@/lib/community/dto'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'
import { db } from '@/lib/database'
import { readerOffers } from '@/lib/database/schema'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'

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

export const POST = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: postId } = await params
  const post = await getCommunityPostById(postId)
  if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 })
  if (post.channel !== 'reader_sos' || post.readerStatus !== 'seeking') {
    return Response.json({ error: 'This request is not open for offers.' }, { status: 400 })
  }
  if (post.authorId === user.userId) {
    return Response.json({ error: "You can't offer to read your own request." }, { status: 400 })
  }

  await db.insert(readerOffers).values({ postId, userId: user.userId }).onConflictDoNothing()

  return Response.json({ success: true }, { status: 201 })
})
