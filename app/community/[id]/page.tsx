import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { getCommunityPostById, listCommentsForPost } from '@/lib/community/queries'
import { PostDetail } from '@/components/community/post-detail'
import { CommentThread } from '@/components/community/comment-thread'

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

  const [post, comments] = await Promise.all([
    getCommunityPostById(id),
    listCommentsForPost(id),
  ])

  if (!post) {
    notFound()
  }

  const isAdmin = (session.user as { role?: string }).role === 'admin'

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-background py-10 md:py-14">
      <div className="mx-auto max-w-4xl px-5 space-y-8 md:px-8">
        <PostDetail
          post={post}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
        />

        <CommentThread postId={post.id} comments={comments} />
      </div>
    </main>
  )
}
