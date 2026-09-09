import { ChannelTabs } from './channel-tabs'
import { CommunityFeed } from './community-feed'
import { PostFormDialog } from './post-form-dialog'
import { TapeCard } from './tape-room/tape-card'
import { TapeFormDialog } from './tape-room/tape-form-dialog'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'
import type { TapeItem } from '@/lib/community/tape-types'

type CommunityView =
  | { kind: 'feed' }
  | { kind: 'tapes'; tapes: TapeItem[] }

export async function CommunityShell({
  view,
  activeChannel,
  activeChannelId = 'all',
  activeStatus = null,
}: {
  view: CommunityView
  activeChannel?: CommunityChannel
  activeChannelId?: string
  activeStatus?: ReaderStatus | null
}) {
  const { community: t } = await getDictionary()

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-ink-foreground/16 pb-8 md:flex-row md:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent font-semibold mb-1">
            {t.shell.badge}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-foreground md:text-4xl">
            The Actor Board
          </h1>
          <p className="mt-2 text-sm text-ink-foreground/65 max-w-xl">{t.shell.subtitle}</p>
        </div>

        <div className="shrink-0">
          {view.kind === 'feed' ? (
            <PostFormDialog initialChannel={activeChannel} feedChannel={activeChannel} feedStatus={activeStatus ?? undefined} />
          ) : (
            <TapeFormDialog />
          )}
        </div>
      </div>

      <ChannelTabs activeChannel={activeChannelId} activeStatus={activeStatus} />

      <div className="mt-8 space-y-4">
        {view.kind === 'feed' ? (
          <CommunityFeed channel={activeChannel} status={activeStatus ?? undefined} activeChannelId={activeChannelId} />
        ) : view.tapes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-foreground/20 bg-ink-card/60 p-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-foreground/5 text-lg text-ink-foreground/60">
              🎬
            </div>
            <h3 className="text-base font-semibold text-ink-foreground">{t.shell.noTapesTitle}</h3>
            <p className="mt-1 text-xs text-ink-foreground/55 max-w-sm mx-auto">{t.shell.noTapesBody}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {view.tapes.map((tape) => (
              <TapeCard key={tape.id} tape={tape} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
