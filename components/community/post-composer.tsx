'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCommunityPost } from '@/app/community/actions'
import type { CommunityChannel, CastingType, RehearsalFormat } from '@/lib/community/types'

export function PostComposer() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [channel, setChannel] = useState<CommunityChannel>('reader_sos')
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !content.trim()) {
      setError('Title and content cannot be empty.')
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

    startTransition(async () => {
      const res = await createCommunityPost(formData)
      if (res?.error) {
        setError(res.error)
      } else if (res?.postId) {
        router.push(`/community/${res.postId}`)
      } else {
        router.push('/community')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-500/15 border border-red-500/30 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Channel selector */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-foreground/55 mb-2">
          Select Channel
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'reader_sos', label: '#reader-sos', desc: 'Need a reader' },
            { id: 'callboard', label: '#the-callboard', desc: 'Castings & Gigs' },
            { id: 'craft_chat', label: '#craft-chat', desc: 'Scene technique' },
            { id: 'general', label: '#general', desc: 'Studio talk' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setChannel(item.id as CommunityChannel)}
              className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                channel === item.id
                  ? 'border-primary bg-primary/15 ring-1 ring-primary'
                  : 'border-ink-foreground/16 bg-ink hover:border-ink-foreground/30'
              }`}
            >
              <span className="font-semibold text-sm text-ink-foreground">{item.label}</span>
              <span className="text-[0.7rem] text-ink-foreground/50">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conditional: #reader-sos fields */}
      {channel === 'reader_sos' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
            <span>🎭</span>
            <span>Reader Request Specifics</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-foreground/80 mb-1">
                When do you need lines read?
              </label>
              <input
                type="datetime-local"
                value={rehearsalAt}
                onChange={(e) => setRehearsalAt(e.target.value)}
                className="w-full rounded-xl border border-ink-foreground/16 bg-ink px-3 py-2 text-xs text-ink-foreground focus:border-ink-foreground/40 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-foreground/80 mb-1">
                Format
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRehearsalFormat('studio')}
                  className={`flex-1 rounded-xl py-2 text-xs font-medium border transition-colors cursor-pointer ${
                    rehearsalFormat === 'studio'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-ink border-ink-foreground/16 text-ink-foreground/75 hover:bg-ink-card'
                  }`}
                >
                  At Studio
                </button>
                <button
                  type="button"
                  onClick={() => setRehearsalFormat('online')}
                  className={`flex-1 rounded-xl py-2 text-xs font-medium border transition-colors cursor-pointer ${
                    rehearsalFormat === 'online'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-ink border-ink-foreground/16 text-ink-foreground/75 hover:bg-ink-card'
                  }`}
                >
                  Online / Video
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-foreground/80 mb-1">
              Scene Details & Characters
            </label>
            <input
              type="text"
              placeholder="e.g. 2 pages, dramatic scene, seeking male reader opposite Sarah"
              value={sceneDetails}
              onChange={(e) => setSceneDetails(e.target.value)}
              className="w-full rounded-xl border border-ink-foreground/16 bg-ink px-3 py-2 text-xs text-ink-foreground placeholder:text-ink-foreground/40 focus:border-ink-foreground/40 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Conditional: #the-callboard fields */}
      {channel === 'callboard' && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
            <span>📢</span>
            <span>Audition & Casting Details</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-foreground/80 mb-1">
                Opportunity Type
              </label>
              <select
                value={castingType}
                onChange={(e) => setCastingType(e.target.value as CastingType)}
                className="w-full rounded-xl border border-ink-foreground/16 bg-ink px-3 py-2 text-xs text-ink-foreground focus:border-ink-foreground/40 focus:outline-none"
              >
                <option value="student_film">Student Film (FDU / BK / Academy)</option>
                <option value="theatre">Theatre Production</option>
                <option value="feature">Feature / Indie Film</option>
                <option value="commercial">Commercial / Voiceover</option>
                <option value="crew_rec">Professional Recommendation (Photos / Coach)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-foreground/80 mb-1">
                Submission Deadline
              </label>
              <input
                type="date"
                value={deadlineAt}
                onChange={(e) => setDeadlineAt(e.target.value)}
                className="w-full rounded-xl border border-ink-foreground/16 bg-ink px-3 py-2 text-xs text-ink-foreground focus:border-ink-foreground/40 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Common title and content */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-foreground/55 mb-1">
          Post Title
        </label>
        <input
          type="text"
          required
          placeholder={
            channel === 'reader_sos'
              ? 'e.g. Need a reader tonight for 20 mins (Cassavetes scene)'
              : channel === 'callboard'
              ? 'e.g. FDU Master Graduation Short — Casting Female Lead (22-28)'
              : 'What would you like to discuss or share?'
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-ink-foreground/16 bg-ink px-4 py-2.5 text-sm text-ink-foreground placeholder:text-ink-foreground/40 focus:border-ink-foreground/40 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-foreground/55 mb-1">
          Content / Description
        </label>
        <textarea
          required
          rows={6}
          placeholder="Provide context, character notes, audition sides, or questions..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-xl border border-ink-foreground/16 bg-ink px-4 py-3 text-sm leading-relaxed text-ink-foreground placeholder:text-ink-foreground/40 focus:border-ink-foreground/40 focus:outline-none"
        />
      </div>

      {/* Attachments */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-foreground/55 mb-1">
          Attachments (Sides, Script Excerpts, Photos)
        </label>
        <input
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={(e) => {
            if (e.target.files) {
              setFiles(Array.from(e.target.files))
            }
          }}
          className="w-full text-xs text-ink-foreground/55 file:mr-4 file:rounded-xl file:border-0 file:bg-ink-foreground/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink-foreground hover:file:bg-ink-foreground/20 cursor-pointer"
        />
        {files.length > 0 && (
          <p className="mt-1 text-xs text-ink-foreground/60">
            {files.length} file{files.length === 1 ? '' : 's'} selected ({files.map((f) => f.name).join(', ')})
          </p>
        )}
      </div>

      {/* Submit button */}
      <div className="flex items-center justify-between border-t border-ink-foreground/16 pt-5">
        <Link
          href="/community"
          className="text-xs font-medium text-ink-foreground/55 hover:text-ink-foreground transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isPending ? 'Publishing...' : 'Publish Post'}
        </button>
      </div>
    </form>
  )
}
