import { ChannelTabs } from './channel-tabs'
import { PostCard } from './post-card'
import { PostFormDialog } from './post-form-dialog'
import { TapeCard } from './tape-room/tape-card'
import { TapeFormDialog } from './tape-room/tape-form-dialog'
import type { CommunityPostItem } from '@/lib/community/types'
import type { TapeItem } from '@/lib/community/tape-types'

type CommunityView =
  | { kind: 'posts'; posts: CommunityPostItem[] }
  | { kind: 'tapes'; tapes: TapeItem[] }

export function CommunityShell({ view }: { view: CommunityView }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
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

        <div className="shrink-0">{view.kind === 'posts' ? <PostFormDialog /> : <TapeFormDialog />}</div>
      </div>

      <ChannelTabs />

      <div className="mt-8 space-y-4">
        {view.kind === 'posts' ? (
          view.posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-foreground/20 bg-ink-card/60 p-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-foreground/5 text-lg text-ink-foreground/60">
                🎭
              </div>
              <h3 className="font-serif text-base font-semibold text-ink-foreground">No posts in this channel yet</h3>
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
            view.posts.map((post) => <PostCard key={post.id} post={post} />)
          )
        ) : view.tapes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-foreground/20 bg-ink-card/60 p-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-foreground/5 text-lg text-ink-foreground/60">
              🎬
            </div>
            <h3 className="text-base font-semibold text-ink-foreground">No tapes yet</h3>
            <p className="mt-1 text-xs text-ink-foreground/55 max-w-sm mx-auto">
              Be the first to share a self-tape or rehearsal clip for feedback.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {view.tapes.map((tape) => (
              <TapeCard key={tape.id} tape={tape} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
