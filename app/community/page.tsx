import { redirect } from 'next/navigation'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { auth } from '@/auth'
import { listCommunityPosts } from '@/lib/community/queries'
import { listTapes } from '@/lib/community/tape-queries'
import { toPostItemDTO } from '@/lib/community/dto'
import { communityKeys } from '@/lib/community/query-keys'
import { CommunityShell } from '@/components/community/community-shell'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; status?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/community')
  }

  const params = await searchParams
  const rawChannel = params.channel
  const status = params.status as ReaderStatus | undefined

  if (rawChannel === 'tape_room') {
    const tapes = await listTapes()
    return (
      <main className="flex-1">
        <CommunityShell view={{ kind: 'tapes', tapes }} activeChannelId={rawChannel} />
      </main>
    )
  }

  const channel = rawChannel as CommunityChannel | undefined
  const activeChannel = channel && channel !== ('all' as unknown) ? channel : undefined

  const queryClient = new QueryClient()
  await queryClient.prefetchInfiniteQuery({
    queryKey: communityKeys.postsList(activeChannel, status),
    queryFn: async () => {
      const { items, nextCursor } = await listCommunityPosts({ channel: activeChannel, status, limit: 20 })
      return { items: items.map(toPostItemDTO), nextCursor }
    },
    initialPageParam: null,
  })

  return (
    <main className="flex-1">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CommunityShell
          view={{ kind: 'feed' }}
          activeChannel={activeChannel}
          activeChannelId={rawChannel ?? 'all'}
          activeStatus={status ?? null}
        />
      </HydrationBoundary>
    </main>
  )
}
