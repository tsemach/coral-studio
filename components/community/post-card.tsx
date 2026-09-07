'use client'

import Link from 'next/link'
import { useTranslation } from '@/components/i18n/language-provider'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import type { CommunityPostItemDTO } from '@/lib/community/dto'

function formatRelativeTime(date: string, t: Dictionary['community']['time']): string {
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

function getCastingTypeLabel(
  castingType: string,
  t: Dictionary['community']['postForm']['castingTypes']
): string {
  switch (castingType) {
    case 'student_film':
      return t.studentFilm
    case 'theatre':
      return t.theatre
    case 'feature':
      return t.feature
    case 'commercial':
      return t.commercial
    case 'crew_rec':
      return t.crewRec
    default:
      return castingType
  }
}

function getRehearsalFormatLabel(
  format: string,
  t: Dictionary['community']['postForm']
): string {
  return format === 'studio' ? t.atStudio : format === 'online' ? t.online : format
}

export function PostCard({
  post,
  activeChannelId,
}: {
  post: CommunityPostItemDTO & { isOptimistic?: boolean }
  activeChannelId?: string
}) {
  const { t } = useTranslation()
  const isReaderSOS = post.channel === 'reader_sos'
  const isCallboard = post.channel === 'callboard'
  // Carries the tab the viewer was on into the detail URL, so closing the
  // modal (PostDetailModal's handleClose) can return to that same tab
  // instead of always resetting to "All Channels".
  const detailHref =
    activeChannelId && activeChannelId !== 'all'
      ? `/community/${post.id}?channel=${activeChannelId}`
      : `/community/${post.id}`

  return (
    <Link
      href={detailHref}
      className={`group relative block rounded-xl border border-ink-foreground/16 bg-ink-card p-5 transition-all hover:border-ink-foreground/35 focus:outline-hidden ${
        post.isOptimistic ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-foreground/55 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-blue-300">
            {getChannelLabel(post.channel)}
          </span>

          {post.isPinned && (
            <span className="inline-flex items-center rounded-md bg-accent/20 px-2 py-0.5 text-[0.65rem] font-bold text-amber-200 border border-amber-400/30 tracking-wide uppercase">
              {t.community.postCard.pinned}
            </span>
          )}

          {isReaderSOS && post.readerStatus && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.7rem] font-medium ${
                post.readerStatus === 'seeking'
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                  : post.readerStatus === 'matched'
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                  : 'bg-ink-foreground/10 text-ink-foreground/50 border border-ink-foreground/15'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  post.readerStatus === 'seeking'
                    ? 'bg-amber-400 animate-pulse'
                    : post.readerStatus === 'matched'
                    ? 'bg-emerald-400'
                    : 'bg-ink-foreground/40'
                }`}
              />
              {post.readerStatus === 'seeking'
                ? t.community.postCard.seekingReader
                : post.readerStatus === 'matched'
                ? t.community.postCard.readerMatched
                : t.community.postCard.closed}
            </span>
          )}

          {isCallboard && post.castingType && (
            <span className="inline-flex items-center rounded-md bg-blue-500/15 px-2 py-0.5 text-[0.7rem] font-medium text-blue-300 border border-blue-500/40 capitalize">
              {getCastingTypeLabel(post.castingType, t.community.postForm.castingTypes)}
            </span>
          )}
        </div>

        <time className="text-ink-foreground/45">{formatRelativeTime(post.createdAt, t.community.time)}</time>
      </div>

      <div>
        <h3 className="text-lg font-semibold tracking-tight text-ink-foreground transition-colors group-hover:text-blue-300 md:text-xl">
          {post.title}
        </h3>

        {/* Specialized metadata strip */}
        {isReaderSOS && (post.rehearsalAt || post.sceneDetails) && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-foreground/80 bg-ink/70 rounded-lg px-3 py-1.5 border border-ink-foreground/12">
            {post.rehearsalAt && (
              <span className="font-medium text-ink-foreground">
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
              <span className="capitalize text-ink-foreground/60 font-medium">
                📍 {getRehearsalFormatLabel(post.rehearsalFormat, t.community.postForm)}
              </span>
            )}
            {post.sceneDetails && (
              <span className="text-ink-foreground/60 truncate max-w-xs">
                📄 {post.sceneDetails}
              </span>
            )}
          </div>
        )}

        {isCallboard && post.deadlineAt && (
          <div className="mt-2 flex items-center gap-2 text-xs text-ink-foreground/80 bg-ink/70 rounded-lg px-3 py-1.5 border border-ink-foreground/12">
            <span className="font-medium text-accent">
              ⏳ {t.community.postCard.deadline}{' '}
              {new Date(post.deadlineAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-foreground/65">
          {post.content}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ink-foreground/12 pt-3 text-xs text-ink-foreground/55">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-foreground/15 text-xs font-semibold text-ink-foreground">
            {post.authorName ? post.authorName.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="font-medium text-ink-foreground/90">
            {post.authorName || t.community.common.anonymousMember}
          </span>
          {post.authorRole === 'admin' && (
            <span className="rounded-md bg-blue-500/15 px-1.5 py-0.2 text-[0.65rem] font-medium text-blue-300 border border-blue-500/40 uppercase tracking-wide">
              {t.community.postCard.studioAdmin}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 transition-colors group-hover:text-blue-300">
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
            <span>
              {post.commentsCount} {post.commentsCount === 1 ? t.community.postCard.reply : t.community.postCard.replies}
            </span>
          </span>
        </div>
      </div>
    </Link>
  )
}
