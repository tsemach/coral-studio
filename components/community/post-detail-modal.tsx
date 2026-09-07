'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useUpdateReaderStatus } from '@/hooks/community/use-update-reader-status'
import { useOfferToRead, useConfirmReader } from '@/hooks/community/use-reader-offers'
import { DeletePostDialog } from './delete-post-dialog'
import { CommentComposer } from './comment-composer'
import { MarkdownContent } from './markdown-content'
import { RehearsalRoom } from './rehearsal-room'
import { SidesViewer } from './sides-viewer'
import type { CommunityPostDetailDTO, CommentWithAuthorDTO, ReaderOfferItemDTO } from '@/lib/community/dto'
import type { ReaderStatus } from '@/lib/community/types'

function formatRelativeTime(date: string): string {
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

export function PostDetailModal({
  post,
  comments,
  currentUserId,
  isAdmin,
  offers,
  hasOffered,
}: {
  post: CommunityPostDetailDTO
  comments: CommentWithAuthorDTO[]
  currentUserId: string
  isAdmin: boolean
  offers: ReaderOfferItemDTO[]
  hasOffered: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const updateStatus = useUpdateReaderStatus(post.id)
  const offerToReadMutation = useOfferToRead(post.id)
  const confirmReaderMutation = useConfirmReader(post.id)
  const [inRoom, setInRoom] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const isAuthor = currentUserId === post.authorId
  const canManage = isAuthor || isAdmin
  const isReaderSOS = post.channel === 'reader_sos'
  const isCallboard = post.channel === 'callboard'
  const isMatchedReader = currentUserId === post.matchedUserId

  const handleClose = () => {
    // The card that opened this post carries its tab in ?channel= (see
    // PostCard's detailHref) so closing lands back on that tab instead of
    // always resetting to "All Channels".
    const originChannel = searchParams.get('channel')
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(originChannel ? `/community?channel=${originChannel}` : '/community')
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      modalRef.current?.requestFullscreen()
    }
  }

  // Keep isFullscreen in sync however fullscreen ends -- our own button,
  // the browser's native Escape handling, or an out-of-band F11/OS action.
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === modalRef.current)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // The fullscreen button only shows while in the room -- leaving it (or the
  // room erroring out) shouldn't strand the viewer in fullscreen with no way
  // to see the exit control.
  useEffect(() => {
    if (!inRoom && document.fullscreenElement === modalRef.current) {
      document.exitFullscreen()
    }
  }, [inRoom])

  // Close on Escape key press -- but while fullscreen, the first Escape
  // should only exit fullscreen (the browser already does this natively);
  // closing the post entirely needs a second, separate Escape press.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  // Prevent background body scroll while modal is open
  useEffect(() => {
    const originalStyle = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  const handleStatusChange = (status: ReaderStatus) => {
    updateStatus.mutate(status)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs [color-scheme:dark]"
    >
      <div
        ref={modalRef}
        className={`relative resize overflow-hidden rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground shadow-2xl flex flex-col [color-scheme:dark] ${
          isFullscreen
            ? 'w-screen h-screen max-w-none max-h-none min-h-0 min-w-0'
            : inRoom
            ? 'w-[min(64rem,95vw)] h-[min(48rem,85vh)] max-w-[95vw] max-h-[90vh] min-h-[28rem] min-w-[36rem]'
            : 'w-[min(42rem,95vw)] max-w-[95vw] max-h-[90vh] min-h-[20rem] min-w-[20rem]'
        }`}
      >
        {/* Top Header with Channel & Close */}
        <div className="flex items-center justify-between border-b border-ink-foreground/16 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-blue-300">
              {getChannelLabel(post.channel)}
            </span>
            <span className="text-ink-foreground/30 text-xs">•</span>
            <time className="text-xs text-ink-foreground/45">{formatRelativeTime(post.createdAt)}</time>
          </div>

          <div className="flex items-center gap-1">
            {inRoom && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="text-ink-foreground/45 hover:text-ink-foreground p-1 cursor-pointer transition-colors"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
                  </svg>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="text-ink-foreground/45 hover:text-ink-foreground text-xl leading-none p-1 cursor-pointer transition-colors"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        {inRoom ? (
          <div
            className={`overflow-y-auto flex-1 pr-1 mt-4 grid gap-4 min-h-0 ${
              post.attachments.length > 0 ? 'md:grid-cols-2' : ''
            }`}
          >
            <RehearsalRoom postId={post.id} onLeave={() => setInRoom(false)} />
            {post.attachments.length > 0 && <SidesViewer attachment={post.attachments[0]} />}
          </div>
        ) : (
        <div className="overflow-y-auto flex-1 pr-1 space-y-5 mt-4">
          {/* Status Badges & Title */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              {post.isPinned && (
                <span className="rounded-md bg-accent/20 px-2 py-0.5 text-[0.65rem] font-bold text-amber-200 border border-amber-400/30 tracking-wide uppercase">
                  Pinned
                </span>
              )}

              {isReaderSOS && post.readerStatus && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                    post.readerStatus === 'seeking'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                      : post.readerStatus === 'matched'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                      : 'bg-ink-foreground/10 text-ink-foreground/50 border border-ink-foreground/15'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      post.readerStatus === 'seeking'
                        ? 'bg-amber-400 animate-pulse'
                        : post.readerStatus === 'matched'
                        ? 'bg-emerald-400'
                        : 'bg-ink-foreground/40'
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
                <span className="rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-300 border border-blue-500/40 capitalize">
                  {post.castingType.replace('_', ' ')}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-ink-foreground md:text-3xl">
              {post.title}
            </h1>

            {/* Author info strip */}
            <div className="mt-3 flex items-center justify-between border-b border-ink-foreground/12 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-foreground/15 text-sm font-semibold text-ink-foreground">
                  {post.authorName ? post.authorName.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-xs text-ink-foreground">{post.authorName || 'Anonymous Member'}</span>
                    {post.authorRole === 'admin' && (
                      <span className="rounded-md bg-blue-500/15 px-1.5 py-0.2 text-[0.65rem] font-medium text-blue-300 border border-blue-500/40 uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-[0.7rem] text-ink-foreground/50">Posted on {new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {canManage && <DeletePostDialog postId={post.id} />}
            </div>
          </div>

          {/* Specialized Reader SOS Session Box */}
          {isReaderSOS && (post.rehearsalAt || post.sceneDetails || post.rehearsalFormat) && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2.5 text-xs">
              <div className="font-semibold text-amber-200 uppercase tracking-wider text-[0.7rem]">
                Reader SOS Session Details
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-ink-foreground">
                {post.rehearsalAt && (
                  <div>
                    <span className="text-ink-foreground/60">Requested Time:</span>{' '}
                    <strong className="font-semibold text-ink-foreground">
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
                    <span className="text-ink-foreground/60">Meeting Format:</span>{' '}
                    <strong className="capitalize text-ink-foreground">{post.rehearsalFormat}</strong>
                  </div>
                )}
                {post.sceneDetails && (
                  <div className="sm:col-span-2">
                    <span className="text-ink-foreground/60">Scene & Character:</span>{' '}
                    <span className="text-ink-foreground">{post.sceneDetails}</span>
                  </div>
                )}
              </div>

              {canManage && (
                <div className="mt-3 pt-3 border-t border-amber-500/20 flex flex-wrap items-center gap-2">
                  <span className="text-ink-foreground/60 font-medium">Change status to:</span>
                  {post.readerStatus !== 'seeking' && (
                    <button
                      type="button"
                      disabled={updateStatus.isPending}
                      onClick={() => handleStatusChange('seeking')}
                      className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-500 transition-colors cursor-pointer"
                    >
                      ↺ Reopen as Seeking
                    </button>
                  )}
                  {post.readerStatus !== 'closed' && (
                    <button
                      type="button"
                      disabled={updateStatus.isPending}
                      onClick={() => handleStatusChange('closed')}
                      className="rounded-lg border border-ink-foreground/20 bg-ink px-2.5 py-1 text-xs font-medium text-ink-foreground hover:bg-ink-foreground/5 transition-colors cursor-pointer"
                    >
                      Close Request
                    </button>
                  )}
                </div>
              )}

              {!isAuthor && post.readerStatus === 'seeking' && !hasOffered && (
                <div className="mt-3 pt-3 border-t border-amber-500/20">
                  <button
                    type="button"
                    disabled={offerToReadMutation.isPending}
                    onClick={() => offerToReadMutation.mutate()}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                  >
                    I can read this
                  </button>
                  {offerToReadMutation.isError && (
                    <p className="mt-1 text-[0.65rem] text-red-300">{offerToReadMutation.error.message}</p>
                  )}
                </div>
              )}

              {canManage && offers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-1.5">
                  <span className="text-ink-foreground/60 font-medium block">Offers to read:</span>
                  {offers.map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between gap-2 text-ink-foreground">
                      <span>
                        {offer.userName || 'Anonymous Member'}
                        <span className="text-ink-foreground/45"> — {offer.sessionsRead} {offer.sessionsRead === 1 ? 'session' : 'sessions'} read</span>
                        {offer.userId === post.matchedUserId && (
                          <span className="ml-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[0.65rem] font-semibold text-emerald-200">
                            Current
                          </span>
                        )}
                      </span>
                      <div className="flex flex-col items-end">
                        <button
                          type="button"
                          disabled={confirmReaderMutation.isPending}
                          onClick={() => confirmReaderMutation.mutate(offer.userId)}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                        >
                          Confirm as reader
                        </button>
                        {confirmReaderMutation.isError && (
                          <p className="mt-1 text-[0.65rem] text-red-300">{confirmReaderMutation.error.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {post.readerStatus === 'matched' && (isAuthor || isMatchedReader) && (
                <div className="mt-3 pt-3 border-t border-amber-500/20">
                  <button
                    type="button"
                    onClick={() => setInRoom(true)}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                  >
                    🎥 Open Rehearsal Room
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Specialized Callboard Box */}
          {isCallboard && post.deadlineAt && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs flex items-center justify-between">
              <span className="text-blue-300 font-medium">Submission Deadline:</span>
              <strong className="text-accent font-bold">
                {new Date(post.deadlineAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>
            </div>
          )}

          {/* Main post body */}
          <MarkdownContent content={post.content} className="text-ink-foreground/90 leading-relaxed text-sm" />

          {/* Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <div className="border-t border-ink-foreground/16 pt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-foreground/55 mb-2.5">
                Attachments ({post.attachments.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {post.attachments.map((att) => {
                  const isImage = att.fileType.startsWith('image/')
                  return (
                    <div
                      key={att.id}
                      className="rounded-xl border border-ink-foreground/16 bg-ink p-2 overflow-hidden text-xs"
                    >
                      {isImage ? (
                        <div className="space-y-1.5">
                          <a href={att.url} target="_blank" rel="noreferrer" className="block relative aspect-4/3 overflow-hidden rounded-lg">
                            <Image
                              src={att.url}
                              alt={att.filename}
                              fill
                              className="object-cover hover:scale-105 transition-transform"
                            />
                          </a>
                          <span className="block truncate text-ink-foreground/55 text-[0.7rem]">{att.filename}</span>
                        </div>
                      ) : (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 p-2 hover:bg-ink-foreground/5 rounded-lg transition-colors"
                        >
                          <span className="text-lg">📄</span>
                          <div className="truncate">
                            <span className="font-medium text-ink-foreground block truncate">{att.filename}</span>
                            <span className="text-ink-foreground/45 text-[0.65rem]">Download document</span>
                          </div>
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Discussion Thread */}
          <section className="border-t border-ink-foreground/16 pt-4 space-y-4">
            <h2 className="text-base font-semibold tracking-tight text-ink-foreground">
              Discussion ({comments.length})
            </h2>

            {comments.length === 0 ? (
              <p className="text-xs text-ink-foreground/50 py-2">
                No replies yet. Be the first to leave a note or offer to read!
              </p>
            ) : (
              <div className="space-y-3 divide-y divide-ink-foreground/12">
                {comments.map((comment) => (
                  <div key={comment.id} className="pt-3 first:pt-0 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-foreground/15 text-[0.65rem] font-semibold text-ink-foreground">
                          {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="font-medium text-ink-foreground text-xs">
                          {comment.authorName || 'Anonymous Member'}
                        </span>
                        {comment.authorRole === 'admin' && (
                          <span className="rounded-md bg-blue-500/15 px-1 py-0.2 text-[0.6rem] font-medium text-blue-300 border border-blue-500/40 uppercase">
                            Admin
                          </span>
                        )}
                      </div>
                      <time className="text-ink-foreground/45 text-[0.65rem]">
                        {formatRelativeTime(comment.createdAt)}
                      </time>
                    </div>

                    <MarkdownContent
                      content={comment.content}
                      className="text-xs text-ink-foreground/85 leading-relaxed pl-7"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Reply Input Box */}
            <div className="pt-2">
              <CommentComposer postId={post.id} />
            </div>
          </section>
        </div>
        )}

        {/* Modal Bottom Actions */}
        <div className="mt-4 pt-3 border-t border-ink-foreground/16 flex justify-end shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
