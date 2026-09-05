import { ChannelTabs } from './channel-tabs'
import { PostCard } from './post-card'
import { PostFormDialog } from './post-form-dialog'
import type { CommunityPostItem } from '@/lib/community/types'

export function CommunityShell({
  posts,
}: {
  posts: CommunityPostItem[]
}) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
      {/* Top Banner & Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-ink-foreground/16 pb-8 md:flex-row md:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent font-semibold mb-1">
            Glumački Studio Community
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink-foreground md:text-4xl">
            The Actor Board
          </h1>
          <p className="mt-2 text-sm text-ink-foreground/65 max-w-xl">
            A live collaborative hub to find line-reading partners, discover local castings and crew recommendations, and discuss scene work.
          </p>
        </div>

        <div className="shrink-0">
          <PostFormDialog />
        </div>
      </div>

      {/* Channel Switcher */}
      <ChannelTabs />

      {/* Posts List */}
      <div className="mt-8 space-y-4">
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-foreground/20 bg-ink-card/60 p-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-foreground/5 text-lg text-ink-foreground/60">
              🎭
            </div>
            <h3 className="font-serif text-base font-semibold text-ink-foreground">
              No posts in this channel yet
            </h3>
            <p className="mt-1 text-xs text-ink-foreground/55 max-w-sm mx-auto">
              Be the first to post a line-reading request, audition notice, or craft question.
            </p>
            <div className="mt-5">
              <PostFormDialog
                triggerLabel="Create a Post"
                triggerClassName="inline-flex items-center gap-1.5 rounded-xl border border-ink-foreground/20 px-3.5 py-1.5 text-xs font-medium text-ink-foreground hover:bg-ink-foreground/5 transition-colors cursor-pointer"
              />
            </div>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}
