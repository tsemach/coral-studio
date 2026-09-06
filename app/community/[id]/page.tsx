import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { getCommunityPostById, listCommentsForPost, listCommunityPosts } from '@/lib/community/queries'
import { CommunityShell } from '@/components/community/community-shell'
import { PostDetailModal } from '@/components/community/post-detail-modal'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const post = await getCommunityPostById(id)

  if (!post) {
    return { title: 'Post Not Found — Glumački Studio' }
  }

  return {
    title: `${post.title} — The Actor Board`,
    description: post.content.slice(0, 160),
  }
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/community/${id}`)
  }

  const [post, comments, boardPosts] = await Promise.all([
    getCommunityPostById(id),
    listCommentsForPost(id),
    listCommunityPosts(),
  ])

  if (!post) {
    notFound()
  }

  const isAdmin = (session.user as { role?: string }).role === 'admin'

  return (
    <main className="flex-1 relative">
      {/* Underlying Community Board */}
      <CommunityShell posts={boardPosts} />

      {/* Floating Post Detail Modal */}
      <PostDetailModal
        post={post}
        comments={comments}
        currentUserId={session.user.id}
        isAdmin={isAdmin}
      />
    </main>
  )
}
