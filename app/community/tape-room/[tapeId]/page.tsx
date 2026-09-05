import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { getTapeById, listNotesForTape, listTapes } from '@/lib/community/tape-queries'
import { CommunityShell } from '@/components/community/community-shell'
import { TapeDetailModal } from '@/components/community/tape-room/tape-detail-modal'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tapeId: string }>
}): Promise<Metadata> {
  const { tapeId } = await params
  const tape = await getTapeById(tapeId)

  if (!tape) {
    return { title: 'Tape Not Found — Glumački Studio' }
  }

  return {
    title: `${tape.title} — Tape Room`,
    description: tape.description.slice(0, 160),
  }
}

export default async function TapeDetailPage({
  params,
}: {
  params: Promise<{ tapeId: string }>
}) {
  const session = await auth()
  const { tapeId } = await params

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/community/tape-room/${tapeId}`)
  }

  const [tape, notes, allTapes] = await Promise.all([
    getTapeById(tapeId),
    listNotesForTape(tapeId),
    listTapes(),
  ])

  if (!tape) {
    notFound()
  }

  const isAdmin = (session.user as { role?: string }).role === 'admin'

  return (
    <main className="flex-1 relative">
      <CommunityShell view={{ kind: 'tapes', tapes: allTapes }} />
      <TapeDetailModal tape={tape} notes={notes} currentUserId={session.user.id} isAdmin={isAdmin} />
    </main>
  )
}
