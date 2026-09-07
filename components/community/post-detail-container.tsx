'use client'

import { usePostDetail, usePostComments, usePostOffers } from '@/hooks/community/use-post-detail'
import { PostDetailModal } from './post-detail-modal'
import { useTranslation } from '@/components/i18n/language-provider'

export function PostDetailContainer({
  postId,
  currentUserId,
  isAdmin,
}: {
  postId: string
  currentUserId: string
  isAdmin: boolean
}) {
  const { t } = useTranslation()
  // Neither depends on the other's result -- both fire on the same tick.
  // This is real client-side parallelism: Route Handlers aren't subject to
  // Next's one-at-a-time Server Action dispatch queue (spec §2).
  const postQuery = usePostDetail(postId)
  const commentsQuery = usePostComments(postId)

  const post = postQuery.data
  // Dependent, not fake-parallel: offers are only relevant once we know the
  // post's channel, which we don't until postQuery resolves.
  const offersQuery = usePostOffers(postId, post?.channel === 'reader_sos')

  if (postQuery.isPending || commentsQuery.isPending) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      >
        <div className="h-64 w-[min(42rem,95vw)] animate-pulse rounded-xl border border-ink-foreground/16 bg-ink-card" />
      </div>
    )
  }

  if (postQuery.isError || !post) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      >
        <div className="rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-sm text-ink-foreground">
          {t.community.postDetail.couldNotLoad}
        </div>
      </div>
    )
  }

  return (
    <PostDetailModal
      post={post}
      comments={commentsQuery.data ?? []}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      offers={offersQuery.data?.offers ?? []}
      hasOffered={offersQuery.data?.hasOffered ?? false}
    />
  )
}
