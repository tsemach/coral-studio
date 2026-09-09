import Link from 'next/link'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import type { TapeItem } from '@/lib/community/tape-types'

function formatRelativeTime(date: Date, t: Dictionary['community']['time']): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return t.justNow
  if (diffMinutes < 60) return t.minutesAgo.replace('{n}', String(diffMinutes))
  if (diffHours < 24) {
    const template = diffHours === 1 ? t.hoursAgoOne : diffHours <= 4 ? t.hoursAgoFew : t.hoursAgoMany
    return template.replace('{n}', String(diffHours))
  }
  if (diffDays === 1) return t.yesterday
  if (diffDays < 7) return t.daysAgo.replace('{n}', String(diffDays))
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

export async function TapeCard({ tape }: { tape: TapeItem }) {
  const { community: t } = await getDictionary()
  const duration = formatDuration(tape.durationSeconds)

  return (
    <Link
      href={`/community/tape-room/${tape.id}`}
      className="group relative block rounded-xl border border-ink-foreground/16 bg-ink-card p-5 transition-all hover:border-ink-foreground/35 focus:outline-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-foreground/55 mb-3">
        <span className="font-semibold text-blue-200">Tape Room</span>
        <time className="text-ink-foreground/45">{formatRelativeTime(tape.createdAt, t.time)}</time>
      </div>

      <div>
        <h3 className="text-lg font-semibold tracking-tight text-ink-foreground transition-colors group-hover:text-blue-200 md:text-xl">
          {tape.title}
        </h3>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-foreground/65">
          {tape.description}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ink-foreground/12 pt-3 text-xs text-ink-foreground/55">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-foreground/15 text-xs font-semibold text-ink-foreground">
            {tape.authorName ? tape.authorName.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="font-medium text-ink-foreground/90">{tape.authorName || t.common.anonymousMember}</span>
        </div>

        <div className="flex items-center gap-3">
          {duration && <span>{duration}</span>}
          <span>{tape.notesCount} {tape.notesCount === 1 ? t.tapeCard.note : t.tapeCard.notes}</span>
        </div>
      </div>
    </Link>
  )
}
