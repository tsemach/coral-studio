'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeleteTapeDialog } from './delete-tape-dialog'
import { NoteComposer } from './note-composer'
import type { TapeItem, TapeNoteItem, TapeNoteTag } from '@/lib/community/tape-types'

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

const TAG_LABELS: Record<TapeNoteTag, string> = {
  objective_action: 'Objective & Action',
  truthfulness_listening: 'Truthfulness & Listening',
  vocal_physicality: 'Vocal & Physicality',
  framing_eyeline: 'Framing & Eyeline',
}

export function TapeDetailModal({
  tape,
  notes,
  currentUserId,
  isAdmin,
}: {
  tape: TapeItem
  notes: TapeNoteItem[]
  currentUserId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [pendingTimestamp, setPendingTimestamp] = useState(0)

  const canManage = currentUserId === tape.authorId || isAdmin

  const handleClose = () => {
    router.push('/community?channel=tape_room')
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  useEffect(() => {
    const originalStyle = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  function openNoteComposer() {
    setPendingTimestamp(Math.floor(videoRef.current?.currentTime ?? 0))
    setIsAddingNote(true)
  }

  function seekTo(seconds: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds
      videoRef.current.play()
    }
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
      <div className="relative w-full max-w-3xl rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-ink-foreground/16 pb-3 shrink-0">
          <span className="font-semibold text-xs text-blue-200">Tape Room</span>
          <button
            type="button"
            onClick={handleClose}
            className="text-ink-foreground/45 hover:text-ink-foreground text-xl leading-none p-1 cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 space-y-5 mt-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-foreground md:text-3xl">
              {tape.title}
            </h1>

            <div className="mt-3 flex items-center justify-between border-b border-ink-foreground/12 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-foreground/15 text-sm font-semibold text-ink-foreground">
                  {tape.authorName ? tape.authorName.charAt(0).toUpperCase() : '?'}
                </div>
                <span className="font-medium text-xs text-ink-foreground">{tape.authorName || 'Anonymous Member'}</span>
              </div>

              {canManage && <DeleteTapeDialog tapeId={tape.id} />}
            </div>
          </div>

          <video ref={videoRef} controls className="w-full rounded-lg bg-black aspect-video">
            <source src={`/community/tape-room/${tape.id}/video`} />
          </video>

          <p className="text-sm leading-relaxed text-ink-foreground/90">{tape.description}</p>

          <section className="border-t border-ink-foreground/16 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight text-ink-foreground">
                Notes ({notes.length})
              </h2>
              {!isAddingNote && (
                <button
                  type="button"
                  onClick={openNoteComposer}
                  className="rounded-lg border border-ink-foreground/20 px-3 py-1.5 text-xs font-medium text-ink-foreground hover:bg-ink-foreground/5 transition-colors cursor-pointer"
                >
                  Add a note here
                </button>
              )}
            </div>

            {isAddingNote && (
              <NoteComposer tapeId={tape.id} timestampSeconds={pendingTimestamp} onDone={() => setIsAddingNote(false)} />
            )}

            {notes.length === 0 ? (
              <p className="text-xs text-ink-foreground/50 py-2">No notes yet. Be the first to leave feedback.</p>
            ) : (
              <div className="space-y-3 divide-y divide-ink-foreground/12">
                {notes.map((note) => (
                  <div key={note.id} className="pt-3 first:pt-0 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => seekTo(note.timestampSeconds)}
                        className="rounded bg-ink-foreground/10 px-1.5 py-0.5 font-mono text-ink-foreground hover:bg-ink-foreground/20 cursor-pointer"
                      >
                        {formatTimestamp(note.timestampSeconds)}
                      </button>
                      <span className="font-medium text-ink-foreground">{note.authorName || 'Anonymous Member'}</span>
                      {note.tag && (
                        <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-[0.65rem] font-medium text-primary-foreground">
                          {TAG_LABELS[note.tag]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-foreground/85 leading-relaxed pl-1">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

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
