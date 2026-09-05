import { CommentComposer } from './comment-composer'
import type { CommentWithAuthor } from '@/lib/community/types'

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function CommentThread({
  postId,
  comments,
}: {
  postId: string
  comments: CommentWithAuthor[]
}) {
  return (
    <section className="rounded-sm border border-border bg-card p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
          Discussion ({comments.length})
        </h2>
      </div>

      {/* Existing Comments */}
      {comments.length === 0 ? (
        <p className="text-xs text-muted py-4 text-center">
          No replies yet. Be the first to leave a note or offer to read!
        </p>
      ) : (
        <div className="space-y-4 divide-y divide-border/40">
          {comments.map((comment) => (
            <div key={comment.id} className="pt-4 first:pt-0 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold text-foreground">
                    {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : '?'}
                  </div>
                  <span className="font-medium text-foreground">
                    {comment.authorName || 'Anonymous Member'}
                  </span>
                  {comment.authorRole === 'admin' && (
                    <span className="rounded-sm bg-primary/15 px-1.5 py-0.2 text-[0.65rem] font-medium text-primary uppercase">
                      Admin
                    </span>
                  )}
                </div>
                <time className="text-muted text-[0.7rem]">
                  {formatRelativeTime(comment.createdAt)}
                </time>
              </div>

              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap pl-8">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Reply Input Box */}
      <div className="border-t border-border/60 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
          Leave a Response
        </h3>
        <CommentComposer postId={postId} />
      </div>
    </section>
  )
}
