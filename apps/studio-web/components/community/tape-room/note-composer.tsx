'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addTapeNote } from '@/app/community/tape-actions'
import { useTranslation } from '@/components/i18n/language-provider'
import type { TapeNoteTag } from '@/lib/community/tape-types'

export function NoteComposer({
  tapeId,
  timestampSeconds,
  onDone,
}: {
  tapeId: string
  timestampSeconds: number
  onDone: () => void
}) {
  const { t } = useTranslation()
  const TAG_OPTIONS: { value: TapeNoteTag; label: string }[] = [
    { value: 'objective_action', label: t.community.tapeNoteTags.objectiveAction },
    { value: 'truthfulness_listening', label: t.community.tapeNoteTags.truthfulnessListening },
    { value: 'vocal_physicality', label: t.community.tapeNoteTags.vocalPhysicality },
    { value: 'framing_eyeline', label: t.community.tapeNoteTags.framingEyeline },
  ]
  const router = useRouter()
  const [content, setContent] = useState('')
  const [tag, setTag] = useState<TapeNoteTag | ''>('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const minutes = Math.floor(timestampSeconds / 60)
  const seconds = timestampSeconds % 60
  const formattedTimestamp = `${minutes}:${String(seconds).padStart(2, '0')}`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setError(null)

    startTransition(async () => {
      const res = await addTapeNote(tapeId, timestampSeconds, content, tag || null)
      if (res?.error) {
        setError(res.error)
      } else {
        setContent('')
        setTag('')
        router.refresh()
        onDone()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-ink-foreground/16 bg-ink p-3">
      <p className="text-xs font-semibold text-ink-foreground/70">
        {t.community.noteComposer.addingNoteAt} {formattedTimestamp}
      </p>

      {error && (
        <div className="rounded-xl bg-red-500/15 border border-red-500/30 p-2 text-xs text-red-200">{error}</div>
      )}

      <textarea
        required
        rows={2}
        placeholder={t.community.noteComposer.placeholder}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full rounded-xl border border-ink-foreground/16 bg-ink-card p-3 text-xs leading-relaxed text-ink-foreground placeholder:text-ink-foreground/45 focus:border-ink-foreground/40 focus:outline-none"
      />

      <div className="flex items-center justify-between gap-2">
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value as TapeNoteTag | '')}
          className="rounded-lg border border-ink-foreground/16 bg-ink-card px-2.5 py-1.5 text-xs text-ink-foreground focus:outline-none"
        >
          <option value="">{t.community.noteComposer.noCategory}</option>
          {TAG_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDone}
            className="rounded-xl px-3 py-1.5 text-xs font-medium text-ink-foreground/60 hover:text-ink-foreground cursor-pointer"
          >
            {t.community.noteComposer.cancel}
          </button>
          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isPending ? t.community.noteComposer.posting : t.community.noteComposer.addNote}
          </button>
        </div>
      </div>
    </form>
  )
}
