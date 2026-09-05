import Link from 'next/link'
import type { TapeItem } from '@/lib/community/tape-types'

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

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

export function TapeCard({ tape }: { tape: TapeItem }) {
  const duration = formatDuration(tape.durationSeconds)

  return (
    <article className="group relative rounded-xl border border-ink-foreground/16 bg-ink-card p-5 transition-all hover:border-ink-foreground/35">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-foreground/55 mb-3">
        <span className="font-semibold text-primary">Tape Room</span>
        <time className="text-ink-foreground/45">{formatRelativeTime(tape.createdAt)}</time>
      </div>

      <Link href={`/community/tape-room/${tape.id}`} className="block focus:outline-hidden">
        <h3 className="text-lg font-semibold tracking-tight text-ink-foreground transition-colors group-hover:text-blue-200 md:text-xl">
          {tape.title}
        </h3>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-foreground/65">
          {tape.description}
        </p>
      </Link>

      <div className="mt-4 flex items-center justify-between border-t border-ink-foreground/12 pt-3 text-xs text-ink-foreground/55">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-foreground/15 text-xs font-semibold text-ink-foreground">
            {tape.authorName ? tape.authorName.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="font-medium text-ink-foreground/90">{tape.authorName || 'Anonymous Member'}</span>
        </div>

        <div className="flex items-center gap-3">
          {duration && <span>{duration}</span>}
          <span>{tape.notesCount} {tape.notesCount === 1 ? 'note' : 'notes'}</span>
        </div>
      </div>
    </article>
  )
}
