import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { listCommunityPosts } from '@/lib/community/queries'
import { CommunityShell } from '@/components/community/community-shell'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

export const metadata: Metadata = {
  title: 'The Actor Board — Glumački Studio',
  description: 'Community board for scene partners, line reading, Belgrade auditions, and craft discussions.',
}

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
    <main className="min-h-[calc(100vh-5rem)] bg-background">
      <CommunityShell posts={posts} currentChannel={channel || 'all'} />
    </main>
  )
}
