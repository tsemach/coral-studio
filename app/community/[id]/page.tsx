import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { auth } from '@/auth'
import { getCommunityPostById, listCommentsForPost, listCommunityPosts } from '@/lib/community/queries'
import { listOffersForPost, hasUserOfferedToRead } from '@/lib/community/reader-queries'
import { toPostItemDTO } from '@/lib/community/dto'
import { communityKeys } from '@/lib/community/query-keys'
import { CommunityShell } from '@/components/community/community-shell'
import { PostDetailModal } from '@/components/community/post-detail-modal'

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

  const [post, comments] = await Promise.all([
    getCommunityPostById(id),
    listCommentsForPost(id),
  ])

  if (!post) {
    notFound()
  }

  const queryClient = new QueryClient()
  await queryClient.prefetchInfiniteQuery({
    queryKey: communityKeys.postsList(undefined, undefined),
    queryFn: async () => {
      const { items, nextCursor } = await listCommunityPosts({ limit: 20 })
      return { items: items.map(toPostItemDTO), nextCursor }
    },
    initialPageParam: null,
  })

  const isAdmin = (session.user as { role?: string }).role === 'admin'
  const isPostAuthorOrAdmin = post.authorId === session.user.id || isAdmin

  const offers = post.channel === 'reader_sos' && isPostAuthorOrAdmin
    ? await listOffersForPost(id)
    : []
  const hasOffered = post.channel === 'reader_sos' && !isPostAuthorOrAdmin
    ? await hasUserOfferedToRead(id, session.user.id)
    : false

  return (
    <main className="flex-1 relative">
      <HydrationBoundary state={dehydrate(queryClient)}>
        {/* Underlying Community Board -- same unfiltered query key as
            /community's default view, so cache is shared between routes. */}
        <CommunityShell view={{ kind: 'feed' }} />

        {/* Floating Post Detail Modal -- rewired to PostDetailContainer in Task 7 */}
        <PostDetailModal
          post={post}
          comments={comments}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
          offers={offers}
          hasOffered={hasOffered}
        />
      </HydrationBoundary>
    </main>
  )
}
