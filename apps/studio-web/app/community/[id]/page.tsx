import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { auth } from '@/auth'
import { getCommunityPostById, listCommentsForPost, listCommunityPosts } from '@/lib/community/queries'
import { listOffersForPost, hasUserOfferedToRead } from '@/lib/community/reader-queries'
import { toPostItemDTO, toPostDetailDTO, toCommentDTO, toOfferDTO } from '@/lib/community/dto'
import { communityKeys } from '@/lib/community/query-keys'
import { CommunityShell } from '@/components/community/community-shell'
import { PostDetailContainer } from '@/components/community/post-detail-container'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const post = await getCommunityPostById(id)

  if (!post) {
    return { title: 'Post Not Found — Glumački Studio' }
  }

  return {
    title: `${post.title} — The Actor Board`,
    description: post.content.slice(0, 160),
  }
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/community/${id}`)
  }

  const post = await getCommunityPostById(id)

  if (!post) {
    notFound()
  }

  const isAdmin = (session.user as { role?: string }).role === 'admin'
  const isPostAuthorOrAdmin = post.authorId === session.user.id || isAdmin

  const [comments, offers, hasOffered] = await Promise.all([
    listCommentsForPost(id),
    post.channel === 'reader_sos' && isPostAuthorOrAdmin ? listOffersForPost(id) : Promise.resolve([]),
    post.channel === 'reader_sos' && !isPostAuthorOrAdmin
      ? hasUserOfferedToRead(id, session.user.id)
      : Promise.resolve(false),
  ])

  const queryClient = new QueryClient()
  await queryClient.prefetchInfiniteQuery({
    queryKey: communityKeys.postsList(undefined, undefined),
    queryFn: async () => {
      const { items, nextCursor } = await listCommunityPosts({ limit: 20 })
      return { items: items.map(toPostItemDTO), nextCursor }
    },
    initialPageParam: null,
  })
  queryClient.setQueryData(communityKeys.postDetail(id), toPostDetailDTO(post))
  queryClient.setQueryData(communityKeys.comments(id), comments.map(toCommentDTO))
  if (post.channel === 'reader_sos') {
    queryClient.setQueryData(communityKeys.offers(id), { offers: offers.map(toOfferDTO), hasOffered })
  }

  return (
    <main className="flex-1 relative">
      <HydrationBoundary state={dehydrate(queryClient)}>
        {/* Underlying Community Board -- same unfiltered query key as
            /community's default view, so cache is shared between routes. */}
        <CommunityShell view={{ kind: 'feed' }} />

        {/* Floating Post Detail Modal -- parallel post+comments queries,
            dependent offers query, all seeded from the server above. */}
        <PostDetailContainer postId={id} currentUserId={session.user.id} isAdmin={isAdmin} />
      </HydrationBoundary>
    </main>
  )
}
