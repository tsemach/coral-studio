'use client'

import { useState } from 'react'
import { useAddComment } from '@/hooks/community/use-add-comment'
import { useTranslation } from '@/components/i18n/language-provider'

export function CommentComposer({ postId }: { postId: string }) {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const mutation = useAddComment(postId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    mutation.mutate(content, { onSuccess: () => setContent('') })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {mutation.isError && (
        <div className="rounded-xl bg-red-500/15 border border-red-500/30 p-2 text-xs text-red-200">
          {mutation.error.message}
        </div>
      )}

      <div>
        <label htmlFor="comment-input" className="sr-only">
          {t.community.commentComposer.writeResponse}
        </label>
        <textarea
          id="comment-input"
          required
          rows={3}
          placeholder={t.community.commentComposer.placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-xl border border-ink-foreground/16 bg-ink p-3 text-xs leading-relaxed text-ink-foreground placeholder:text-ink-foreground/45 focus:border-ink-foreground/40 focus:outline-none"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={mutation.isPending || !content.trim()}
          className="rounded-xl border border-blue-400/50 bg-blue-500/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-xs hover:bg-blue-500/65 disabled:opacity-50 transition-all cursor-pointer"
        >
          {mutation.isPending ? t.community.commentComposer.posting : t.community.commentComposer.reply}
        </button>
      </div>
    </form>
  )
}
