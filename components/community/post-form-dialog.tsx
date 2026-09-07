'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreatePost } from '@/hooks/community/use-create-post'
import { useTranslation } from '@/components/i18n/language-provider'
import type { CommunityChannel, CastingType, RehearsalFormat, ReaderStatus } from '@/lib/community/types'

export type DialogHandle = { open: () => void }

interface PostFormDialogProps {
  hideTrigger?: boolean
  triggerLabel?: string
  triggerClassName?: string
  initialChannel?: CommunityChannel
  feedChannel?: CommunityChannel
  feedStatus?: ReaderStatus
}

export const PostFormDialog = forwardRef<DialogHandle, PostFormDialogProps>(function PostFormDialog(
  { hideTrigger = false, triggerLabel, triggerClassName, initialChannel = 'reader_sos', feedChannel, feedStatus },
  ref
) {
  const { t } = useTranslation()
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState<string | null>(null)
  const mutation = useCreatePost(feedChannel, feedStatus)

  const [channel, setChannel] = useState<CommunityChannel>(initialChannel)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // Specialized fields for #reader-sos
  const [rehearsalAt, setRehearsalAt] = useState('')
  const [rehearsalFormat, setRehearsalFormat] = useState<RehearsalFormat>('studio')
  const [sceneDetails, setSceneDetails] = useState('')

  // Specialized fields for #the-callboard
  const [castingType, setCastingType] = useState<CastingType>('student_film')
  const [deadlineAt, setDeadlineAt] = useState('')

  // Attachments
  const [files, setFiles] = useState<File[]>([])

  function open() {
    setChannel(initialChannel)
    setTitle('')
    setContent('')
    setRehearsalAt('')
    setRehearsalFormat('studio')
    setSceneDetails('')
    setCastingType('student_film')
    setDeadlineAt('')
    setFiles([])
    setError(null)
    dialogRef.current?.showModal()
  }

  useImperativeHandle(ref, () => ({ open }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !content.trim()) {
      setError(t.community.postForm.requiredError)
      return
    }

    const formData = new FormData()
    formData.append('channel', channel)
    formData.append('title', title)
    formData.append('content', content)

    if (channel === 'reader_sos') {
      if (rehearsalAt) formData.append('rehearsalAt', rehearsalAt)
      formData.append('rehearsalFormat', rehearsalFormat)
      if (sceneDetails) formData.append('sceneDetails', sceneDetails)
    }

    if (channel === 'callboard') {
      formData.append('castingType', castingType)
      if (deadlineAt) formData.append('deadlineAt', deadlineAt)
    }

    for (const file of files) {
      formData.append('attachments', file)
    }

    mutation.mutate(formData, {
      onError: (err) => setError(err.message),
      onSuccess: (res) => {
        dialogRef.current?.close()
        if (res?.postId) router.push(`/community/${res.postId}`)
      },
    })
  }

  return (
    <>
      {!hideTrigger && (
        <button
          type="button"
          onClick={open}
          className={
            triggerClassName ||
            'inline-flex items-center gap-2 rounded-xl border border-blue-400/50 bg-blue-500/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-xs transition-transform hover:-translate-y-0.5 hover:bg-blue-500/65 cursor-pointer'
          }
        >
          {triggerLabel ?? t.community.postForm.trigger}
        </button>
      )}

      {/* Modal Dialog matching WorkshopFormDialog */}
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="m-auto w-full max-w-lg border-0 bg-transparent p-4 backdrop:bg-black/60 [color-scheme:dark]"
      >
        <div className="w-full rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground shadow-2xl max-h-[88vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2">
            <div>
              <p className="text-lg font-semibold text-ink-foreground">{t.community.postForm.title}</p>
              <p className="mt-1 text-sm text-ink-foreground/60">{t.community.postForm.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-ink-foreground/45 hover:text-ink-foreground text-xl leading-none p-1 cursor-pointer"
              aria-label={t.community.postForm.closeDialog}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {error && (
              <p className="rounded-lg bg-red-500/15 border border-red-500/30 p-2.5 text-xs text-red-200">
                {error}
              </p>
            )}

            {/* Channel Selection */}
            <div className="flex flex-col gap-1 text-sm">
              <span>{t.community.postForm.channelLabel}</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'reader_sos', label: '#reader-sos', desc: t.community.postForm.channels.readerSos.desc },
                  { id: 'callboard', label: '#the-callboard', desc: t.community.postForm.channels.callboard.desc },
                  { id: 'craft_chat', label: '#craft-chat', desc: t.community.postForm.channels.craftChat.desc },
                  { id: 'general', label: '#general', desc: t.community.postForm.channels.general.desc },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setChannel(item.id as CommunityChannel)}
                    className={`flex flex-col text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                      channel === item.id
                        ? 'border-blue-500/40 bg-blue-500/15 ring-1 ring-blue-500/40'
                        : 'border-ink-foreground/16 bg-ink hover:border-ink-foreground/30'
                    }`}
                  >
                    <span className="font-semibold text-xs text-ink-foreground">{item.label}</span>
                    <span className="text-[0.65rem] text-ink-foreground/50">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional: #reader-sos fields */}
            {channel === 'reader_sos' && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                  <span>🎭</span>
                  <span>{t.community.postForm.readerSpecifics}</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs text-ink-foreground/80">
                    {t.community.postForm.whenNeedLines}
                    <input
                      type="datetime-local"
                      value={rehearsalAt}
                      onChange={(e) => setRehearsalAt(e.target.value)}
                      className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-1.5 text-xs text-ink-foreground focus:outline-none"
                    />
                  </label>

                  <div className="flex flex-col gap-1 text-xs text-ink-foreground/80">
                    {t.community.postForm.format}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRehearsalFormat('studio')}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                          rehearsalFormat === 'studio'
                            ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                            : 'bg-ink border-ink-foreground/16 text-ink-foreground/75 hover:bg-ink-card'
                        }`}
                      >
                        {t.community.postForm.atStudio}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRehearsalFormat('online')}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                          rehearsalFormat === 'online'
                            ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                            : 'bg-ink border-ink-foreground/16 text-ink-foreground/75 hover:bg-ink-card'
                        }`}
                      >
                        {t.community.postForm.online}
                      </button>
                    </div>
                  </div>
                </div>

                <label className="flex flex-col gap-1 text-xs text-ink-foreground/80">
                  {t.community.postForm.sceneDetailsLabel}
                  <input
                    type="text"
                    placeholder={t.community.postForm.sceneDetailsPlaceholder}
                    value={sceneDetails}
                    onChange={(e) => setSceneDetails(e.target.value)}
                    className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-1.5 text-xs text-ink-foreground placeholder:text-ink-foreground/40 focus:outline-none"
                  />
                </label>
              </div>
            )}

            {/* Conditional: #the-callboard fields */}
            {channel === 'callboard' && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
                  <span>📢</span>
                  <span>{t.community.postForm.auditionDetails}</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs text-ink-foreground/80">
                    {t.community.postForm.opportunityType}
                    <select
                      value={castingType}
                      onChange={(e) => setCastingType(e.target.value as CastingType)}
                      className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-1.5 text-xs text-ink-foreground focus:outline-none"
                    >
                      <option value="student_film">{t.community.postForm.castingTypes.studentFilm}</option>
                      <option value="theatre">{t.community.postForm.castingTypes.theatre}</option>
                      <option value="feature">{t.community.postForm.castingTypes.feature}</option>
                      <option value="commercial">{t.community.postForm.castingTypes.commercial}</option>
                      <option value="crew_rec">{t.community.postForm.castingTypes.crewRec}</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-ink-foreground/80">
                    {t.community.postForm.submissionDeadline}
                    <input
                      type="date"
                      value={deadlineAt}
                      onChange={(e) => setDeadlineAt(e.target.value)}
                      className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-1.5 text-xs text-ink-foreground focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Title */}
            <label className="flex flex-col gap-1 text-sm">
              {t.community.postForm.titleLabel}
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  channel === 'reader_sos'
                    ? t.community.postForm.titlePlaceholderReaderSos
                    : channel === 'callboard'
                    ? t.community.postForm.titlePlaceholderCallboard
                    : t.community.postForm.titlePlaceholderGeneral
                }
                className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground placeholder:text-ink-foreground/45 focus:outline-none"
              />
            </label>

            {/* Content */}
            <label className="flex flex-col gap-1 text-sm">
              {t.community.postForm.contentLabel}
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t.community.postForm.contentPlaceholder}
                className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm leading-relaxed text-ink-foreground placeholder:text-ink-foreground/45 focus:outline-none"
              />
            </label>

            {/* Attachments */}
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex items-center justify-between">
                <span>{t.community.postForm.attachmentsLabel}</span>
                <span className="text-xs text-ink-foreground/45">{t.community.postForm.optional}</span>
              </span>
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={(e) => {
                  if (e.target.files) setFiles(Array.from(e.target.files))
                }}
                className="w-full text-xs text-ink-foreground/55 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-foreground/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink-foreground hover:file:bg-ink-foreground/20 cursor-pointer"
              />
              {files.length > 0 && (
                <span className="text-xs text-ink-foreground/60">
                  {(files.length === 1
                    ? t.community.postForm.filesSelectedOne
                    : t.community.postForm.filesSelectedMany.replace('{count}', String(files.length))
                  ).replace('{names}', files.map((f) => f.name).join(', '))}
                </span>
              )}
            </label>

            {/* Actions */}
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground cursor-pointer"
              >
                {t.community.postForm.cancel}
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-xl border border-blue-400/50 bg-blue-500/50 px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-blue-500/65 disabled:opacity-50 cursor-pointer"
              >
                {mutation.isPending ? t.community.postForm.publishing : t.community.postForm.create}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
})
