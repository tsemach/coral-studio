'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { updateReaderStatus, deleteCommunityPost } from '@/app/community/actions'
import type { CommunityPostDetail, ReaderStatus } from '@/lib/community/types'

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

export function PostDetail({
  post,
  currentUserId,
  isAdmin,
}: {
  post: CommunityPostDetail
  currentUserId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isAuthor = currentUserId === post.authorId
  const canManage = isAuthor || isAdmin
  const isReaderSOS = post.channel === 'reader_sos'
  const isCallboard = post.channel === 'callboard'

  const handleStatusChange = (status: ReaderStatus) => {
    startTransition(async () => {
      await updateReaderStatus(post.id, status)
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this post?')) {
      startTransition(async () => {
        await deleteCommunityPost(post.id)
        router.push('/community')
      })
    }
  }

  return (
    <div className="rounded-sm border border-border bg-card p-6 md:p-8 space-y-6">
      {/* Back and Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
        >
          <span>←</span>
          <span>Back to All Posts</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-primary">
            {getChannelLabel(post.channel)}
          </span>
          <span className="text-muted text-xs">•</span>
          <time className="text-xs text-muted">{formatRelativeTime(post.createdAt)}</time>
        </div>
      </div>

      {/* Title & Status Controls */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {post.isPinned && (
            <span className="rounded-sm bg-accent/20 px-2 py-0.5 text-[0.65rem] font-bold text-accent-foreground tracking-wide uppercase">
              Pinned
            </span>
          )}

          {isReaderSOS && post.readerStatus && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-semibold ${
                post.readerStatus === 'seeking'
                  ? 'bg-amber-500/20 text-amber-900 border border-amber-500/30'
                  : post.readerStatus === 'matched'
                  ? 'bg-emerald-500/20 text-emerald-900 border border-emerald-500/30'
                  : 'bg-muted/20 text-muted border border-border'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
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
            <span className="rounded-sm bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-900 border border-blue-500/25 capitalize">
              {post.castingType.replace('_', ' ')}
            </span>
          )}
        </div>

        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {post.title}
        </h1>

        {/* Author info strip */}
        <div className="mt-3 flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold text-foreground">
              {post.authorName ? post.authorName.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-xs text-foreground">{post.authorName || 'Anonymous Member'}</span>
                {post.authorRole === 'admin' && (
                  <span className="rounded-sm bg-primary/15 px-1.5 py-0.2 text-[0.65rem] font-medium text-primary uppercase">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[0.7rem] text-muted">Posted on {new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          {canManage && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="text-xs text-red-800 hover:text-red-950 transition-colors cursor-pointer"
            >
              Delete Post
            </button>
          )}
        </div>
      </div>

      {/* Specialized metadata display box */}
      {isReaderSOS && (post.rehearsalAt || post.sceneDetails || post.rehearsalFormat) && (
        <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-xs">
          <div className="font-semibold text-amber-950 uppercase tracking-wider text-[0.7rem]">
            Reader SOS Session Details
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-foreground">
            {post.rehearsalAt && (
              <div>
                <span className="text-muted">Requested Time:</span>{' '}
                <strong className="font-semibold">
                  {new Date(post.rehearsalAt).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </div>
            )}
            {post.rehearsalFormat && (
              <div>
                <span className="text-muted">Meeting Format:</span>{' '}
                <strong className="capitalize">{post.rehearsalFormat}</strong>
              </div>
            )}
            {post.sceneDetails && (
              <div className="sm:col-span-2">
                <span className="text-muted">Scene & Character:</span>{' '}
                <span>{post.sceneDetails}</span>
              </div>
            )}
          </div>

          {/* Author status toggle actions */}
          {canManage && (
            <div className="mt-3 pt-3 border-t border-amber-500/20 flex flex-wrap items-center gap-2">
              <span className="text-muted font-medium">Update Status:</span>
              {post.readerStatus !== 'matched' && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatusChange('matched')}
                  className="rounded-sm bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  ✓ Mark as Matched
                </button>
              )}
              {post.readerStatus !== 'seeking' && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatusChange('seeking')}
                  className="rounded-sm bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  ↺ Reopen as Seeking
                </button>
              )}
              {post.readerStatus !== 'closed' && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatusChange('closed')}
                  className="rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-foreground/5 transition-colors cursor-pointer"
                >
                  Close Request
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isCallboard && post.deadlineAt && (
        <div className="rounded-sm border border-blue-500/30 bg-blue-500/10 p-3 text-xs flex items-center justify-between">
          <span className="text-blue-950 font-medium">
            Submission Deadline:
          </span>
          <strong className="text-primary font-bold">
            {new Date(post.deadlineAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </strong>
        </div>
      )}

      {/* Main post body */}
      <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
        {post.content}
      </div>

      {/* Attachments gallery */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="border-t border-border/60 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
            Attachments ({post.attachments.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {post.attachments.map((att) => {
              const isImage = att.fileType.startsWith('image/')
              return (
                <div
                  key={att.id}
                  className="rounded-sm border border-border bg-background/50 p-2 overflow-hidden text-xs"
                >
                  {isImage ? (
                    <div className="space-y-1.5">
                      <a href={att.url} target="_blank" rel="noreferrer" className="block relative aspect-4/3 overflow-hidden rounded-xs">
                        <Image
                          src={att.url}
                          alt={att.filename}
                          fill
                          className="object-cover hover:scale-105 transition-transform"
                        />
                      </a>
                      <span className="block truncate text-muted text-[0.7rem]">{att.filename}</span>
                    </div>
                  ) : (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-2 hover:bg-foreground/5 rounded-xs transition-colors"
                    >
                      <span className="text-lg">📄</span>
                      <div className="truncate">
                        <span className="font-medium text-foreground block truncate">{att.filename}</span>
                        <span className="text-muted text-[0.65rem]">Download document</span>
                      </div>
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
