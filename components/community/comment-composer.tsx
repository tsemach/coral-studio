'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addCommunityComment } from '@/app/community/actions'

export function CommentComposer({ postId }: { postId: string }) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setError(null)

    startTransition(async () => {
      const res = await addCommunityComment(postId, content)
      if (res?.error) {
        setError(res.error)
      } else {
        setContent('')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-sm bg-red-500/10 border border-red-500/30 p-2 text-xs text-red-900">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="comment-input" className="sr-only">
          Write a response
        </label>
        <textarea
          id="comment-input"
          required
          rows={3}
          placeholder="Offer to read lines, ask a question, or reply..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-sm border border-border bg-card p-3 text-xs leading-relaxed text-foreground placeholder:text-muted/70 focus:outline-hidden focus:border-primary"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="rounded-sm bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isPending ? 'Posting...' : 'Reply'}
        </button>
      </div>
    </form>
  )
}
