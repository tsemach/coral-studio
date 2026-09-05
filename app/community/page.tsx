import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { listCommunityPosts } from '@/lib/community/queries'
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
  const channel = params.channel as CommunityChannel | undefined
  const status = params.status as ReaderStatus | undefined

  const posts = await listCommunityPosts(
    channel && channel !== ('all' as unknown) ? channel : undefined,
    status
  )

  return (
    <main className="flex-1">
      <CommunityShell posts={posts} currentChannel={channel || 'all'} />
    </main>
  )
}
