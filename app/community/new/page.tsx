import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { PostComposer } from '@/components/community/post-composer'

export const metadata: Metadata = {
  title: 'New Post — The Actor Board',
  description: 'Create a new line-reading request, casting announcement, or scene question.',
}

export default async function NewPostPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/community/new')
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-background">
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-14">
        <div className="mb-6">
          <Link
            href="/community"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors mb-3"
          >
            <span>←</span>
            <span>Back to The Actor Board</span>
          </Link>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Create a New Post
          </h1>
          <p className="mt-1 text-xs text-muted">
            Share an audition opportunity, request a scene partner, or discuss acting technique.
          </p>
        </div>

        <div className="rounded-sm border border-border bg-card p-6 md:p-8">
          <PostComposer />
        </div>
      </div>
    </main>
  )
}
