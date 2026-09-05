'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { createTape } from '@/app/community/tape-actions'
import { TapeRecorder, type TapeRecorderHandle } from './tape-recorder'
import { getVideoDuration } from './video-duration'

export function TapeFormDialog() {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const recorderRef = useRef<TapeRecorderHandle>(null)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)

  function open() {
    setTitle('')
    setDescription('')
    setVideoFile(null)
    setError(null)
    dialogRef.current?.showModal()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.')
      return
    }
    if (!videoFile) {
      setError('Attach a video by uploading a file or recording one.')
      return
    }

    setIsUploading(true)
    ;(async () => {
      try {
        const durationSeconds = await getVideoDuration(videoFile)
        const blob = await upload(videoFile.name, videoFile, {
          access: 'private',
          handleUploadUrl: '/community/tape-room/upload',
        })

        startTransition(async () => {
          const res = await createTape({
            title,
            description,
            videoPathname: blob.pathname,
            durationSeconds,
          })
          if (res?.error) {
            setError(res.error)
          } else {
            dialogRef.current?.close()
            if ('tapeId' in res) {
              router.push(`/community/tape-room/${res.tapeId}`)
            } else {
              router.refresh()
            }
          }
        })
      } catch {
        setError('Could not upload the video. Please try again.')
      } finally {
        setIsUploading(false)
      }
    })()
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-xs transition-transform hover:-translate-y-0.5 cursor-pointer"
      >
        + New Tape
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            recorderRef.current?.stopCamera()
            dialogRef.current?.close()
          }
        }}
        onClose={() => recorderRef.current?.stopCamera()}
        className="m-auto w-full max-w-lg border-0 bg-transparent p-4 backdrop:bg-black/60 [color-scheme:dark]"
      >
        <div className="w-full rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground shadow-2xl max-h-[88vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2">
            <div>
              <p className="text-lg font-semibold text-ink-foreground">New tape</p>
              <p className="mt-1 text-sm text-ink-foreground/60">
                Upload a self-tape or record one right now for peer feedback.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                recorderRef.current?.stopCamera()
                dialogRef.current?.close()
              }}
              className="text-ink-foreground/45 hover:text-ink-foreground text-xl leading-none p-1 cursor-pointer"
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {error && (
              <p className="rounded-lg bg-red-500/15 border border-red-500/30 p-2.5 text-xs text-red-200">{error}</p>
            )}

            <label className="flex flex-col gap-1 text-sm">
              Title
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hedda Gabler monologue, take 3"
                className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground placeholder:text-ink-foreground/45 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Description
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's the scene, and what kind of feedback are you looking for?"
                className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm leading-relaxed text-ink-foreground placeholder:text-ink-foreground/45 focus:outline-none"
              />
            </label>

            <div className="flex flex-col gap-2 text-sm">
              <span>Video</span>

              {videoFile ? (
                <div className="flex items-center justify-between rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-xs text-ink-foreground/80">
                  <span className="truncate">{videoFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setVideoFile(null)}
                    className="text-ink-foreground/50 hover:text-ink-foreground cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setVideoFile(file)
                    }}
                    className="w-full text-xs text-ink-foreground/55 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-foreground/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink-foreground hover:file:bg-ink-foreground/20 cursor-pointer"
                  />
                  <p className="text-xs text-ink-foreground/45">or</p>
                  <TapeRecorder ref={recorderRef} onRecorded={setVideoFile} />
                </div>
              )}
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  recorderRef.current?.stopCamera()
                  dialogRef.current?.close()
                }}
                className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || isUploading}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? 'Uploading…' : isPending ? 'Publishing…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
}
