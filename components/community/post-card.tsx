import Link from 'next/link'
import type { CommunityPostItem } from '@/lib/community/types'

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

function getChannelLabel(channel: string): string {
  switch (channel) {
    case 'reader_sos':
      return '#reader-sos'
    case 'callboard':
      return '#the-callboard'
    case 'craft_chat':
      return '#craft-chat'
    default:
      return '#general'
  }
}

export function PostCard({ post }: { post: CommunityPostItem }) {
  const isReaderSOS = post.channel === 'reader_sos'
  const isCallboard = post.channel === 'callboard'

  return (
    <article className="group relative rounded-sm border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-primary">
            {getChannelLabel(post.channel)}
          </span>

          {post.isPinned && (
            <span className="inline-flex items-center rounded-sm bg-accent/20 px-2 py-0.5 text-[0.65rem] font-bold text-accent-foreground tracking-wide uppercase">
              Pinned
            </span>
          )}

          {isReaderSOS && post.readerStatus && (
            <span
              className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[0.7rem] font-medium ${
                post.readerStatus === 'seeking'
                  ? 'bg-amber-500/20 text-amber-900 border border-amber-500/30'
                  : post.readerStatus === 'matched'
                  ? 'bg-emerald-500/20 text-emerald-900 border border-emerald-500/30'
                  : 'bg-muted/20 text-muted border border-border'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  post.readerStatus === 'seeking'
                    ? 'bg-amber-600 animate-pulse'
                    : post.readerStatus === 'matched'
                    ? 'bg-emerald-600'
                    : 'bg-muted'
                }`}
              />
              {post.readerStatus === 'seeking'
                ? 'Seeking Reader'
                : post.readerStatus === 'matched'
                ? 'Reader Matched'
                : 'Closed'}
            </span>
          )}

          {isCallboard && post.castingType && (
            <span className="inline-flex items-center rounded-sm bg-blue-500/15 px-2 py-0.5 text-[0.7rem] font-medium text-blue-900 border border-blue-500/25 capitalize">
              {post.castingType.replace('_', ' ')}
            </span>
          )}
        </div>

        <time className="text-muted/80">{formatRelativeTime(post.createdAt)}</time>
      </div>

      <Link href={`/community/${post.id}`} className="block focus:outline-hidden">
        <h3 className="font-serif text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary md:text-xl">
          {post.title}
        </h3>

        {/* Specialized metadata strip */}
        {isReaderSOS && (post.rehearsalAt || post.sceneDetails) && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground/80 bg-background/60 rounded-sm px-3 py-1.5 border border-border/50">
            {post.rehearsalAt && (
              <span className="font-medium">
                🕒 {new Date(post.rehearsalAt).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            {post.rehearsalFormat && (
              <span className="capitalize text-muted font-medium">
                📍 {post.rehearsalFormat}
              </span>
            )}
            {post.sceneDetails && (
              <span className="text-muted truncate max-w-xs">
                📄 {post.sceneDetails}
              </span>
            )}
          </div>
        )}

        {isCallboard && post.deadlineAt && (
          <div className="mt-2 flex items-center gap-2 text-xs text-foreground/80 bg-background/60 rounded-sm px-3 py-1.5 border border-border/50">
            <span className="font-medium text-primary">
              ⏳ Deadline: {new Date(post.deadlineAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">
          {post.content}
        </p>
      </Link>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold text-foreground">
            {post.authorName ? post.authorName.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="font-medium text-foreground">{post.authorName || 'Anonymous Member'}</span>
          {post.authorRole === 'admin' && (
            <span className="rounded-sm bg-primary/15 px-1.5 py-0.2 text-[0.65rem] font-medium text-primary uppercase tracking-wide">
              Studio Admin
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>{post.commentsCount} {post.commentsCount === 1 ? 'reply' : 'replies'}</span>
          </span>
        </div>
      </div>
    </article>
  )
}
