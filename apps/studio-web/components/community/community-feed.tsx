'use client'

import { useCommunityPosts } from '@/hooks/community/use-community-posts'
import { PostCard } from './post-card'
import { PostFormDialog } from './post-form-dialog'
import { useTranslation } from '@/components/i18n/language-provider'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

export function CommunityFeed({
  channel,
  status,
  activeChannelId,
}: {
  channel?: CommunityChannel
  status?: ReaderStatus
  activeChannelId: string
}) {
  const { t } = useTranslation()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending, isError } =
    useCommunityPosts(channel, status)

  if (isPending) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-ink-foreground/16 bg-ink-card/60" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-red-300">{t.community.feed.loadError}</p>
  }

  const posts = data.pages.flatMap((page) => page.items)

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-foreground/20 bg-ink-card/60 p-12 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-foreground/5 text-lg text-ink-foreground/60">
          🎭
        </div>
        <h3 className="text-base font-semibold text-ink-foreground">{t.community.feed.emptyTitle}</h3>
        <p className="mt-1 text-xs text-ink-foreground/55 max-w-sm mx-auto">{t.community.feed.emptyBody}</p>
        <div className="mt-5">
          <PostFormDialog
            triggerLabel={t.community.feed.createPost}
            triggerClassName="inline-flex items-center gap-1.5 rounded-xl border border-ink-foreground/20 px-3.5 py-1.5 text-xs font-medium text-ink-foreground hover:bg-ink-foreground/5 transition-colors cursor-pointer"
            initialChannel={channel}
            feedChannel={channel}
            feedStatus={status}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} activeChannelId={activeChannelId} />
      ))}
      {hasNextPage && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full rounded-xl border border-ink-foreground/16 py-2.5 text-sm font-medium text-ink-foreground/70 hover:text-ink-foreground disabled:opacity-50"
        >
          {isFetchingNextPage ? t.community.feed.loadingMore : t.community.feed.loadMore}
        </button>
      )}
    </div>
  )
}
