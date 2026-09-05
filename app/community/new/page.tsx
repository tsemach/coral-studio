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
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
        <div className="mb-6">
          <Link
            href="/community"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-foreground/55 hover:text-ink-foreground transition-colors mb-3"
          >
            <span>←</span>
            <span>Back to The Actor Board</span>
          </Link>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink-foreground md:text-3xl">
            Create a New Post
          </h1>
          <p className="mt-1 text-xs text-ink-foreground/55">
            Share an audition opportunity, request a scene partner, or discuss acting technique.
          </p>
        </div>

        <div className="rounded-xl border border-ink-foreground/16 bg-ink-card p-6 md:p-8">
          <PostComposer />
        </div>
      </div>
    </main>
  )
}
