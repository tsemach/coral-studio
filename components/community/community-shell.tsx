import Link from 'next/link'
import { ChannelTabs } from './channel-tabs'
import { PostCard } from './post-card'
import type { CommunityPostItem } from '@/lib/community/types'

export function CommunityShell({
  posts,
  currentChannel,
}: {
  posts: CommunityPostItem[]
  currentChannel: string
}) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
      {/* Top Banner & Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-8 md:flex-row md:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-primary font-semibold mb-2">
            Glumački Studio Community
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            The Actor Board
          </h1>
          <p className="mt-2 text-sm text-muted max-w-xl">
            A live collaborative hub to find line-reading partners, discover local castings and crew recommendations, and discuss scene work.
          </p>
        </div>

        <div className="shrink-0">
          <Link
            href="/community/new"
            className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            <span>+</span>
            <span>New Post</span>
          </Link>
        </div>
      </div>

      {/* Channel Switcher */}
      <ChannelTabs />

      {/* Posts List */}
      <div className="mt-8 space-y-4">
        {posts.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border bg-card/60 p-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5 text-lg text-muted">
              🎭
            </div>
            <h3 className="font-serif text-base font-semibold text-foreground">
              No posts in this channel yet
            </h3>
            <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
              Be the first to post a line-reading request, audition notice, or craft question.
            </p>
            <div className="mt-5">
              <Link
                href="/community/new"
                className="inline-flex items-center gap-1.5 rounded-sm border border-foreground/20 px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/5 transition-colors"
              >
                Create a Post
              </Link>
            </div>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}
