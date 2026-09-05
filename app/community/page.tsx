import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { listCommunityPosts } from '@/lib/community/queries'
import { listTapes } from '@/lib/community/tape-queries'
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
        <CommunityShell view={{ kind: 'tapes', tapes }} />
      </main>
    )
  }

  const channel = rawChannel as CommunityChannel | undefined
  const posts = await listCommunityPosts(
    channel && channel !== ('all' as unknown) ? channel : undefined,
    status
  )

  return (
    <main className="flex-1">
      <CommunityShell view={{ kind: 'posts', posts }} />
    </main>
  )
}
