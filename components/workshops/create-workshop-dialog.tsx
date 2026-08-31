'use client'

import { useRef, useState } from 'react'
import { createWorkshop } from '@/app/workshops/actions'
import { UserPicker } from '@/components/workshops/user-picker'
import type { AddableUser } from '@/lib/workshops/queries'
import type { ScriptSummary } from '@/lib/workshops/scripts'

type DraftMember = { userId: string; name: string | null; email: string; type: 'actor' | 'viewer'; part: string }

export function CreateWorkshopDialog({
  availableUsers,
  availableScripts,
}: {
  availableUsers: AddableUser[]
  availableScripts: ScriptSummary[]
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState('')
  const [scriptSlug, setScriptSlug] = useState('')
  const [pickerValue, setPickerValue] = useState('')
  const [members, setMembers] = useState<DraftMember[]>([])
  const [error, setError] = useState<string | null>(null)

  function open() {
    setTitle('')
    setScriptSlug('')
    setPickerValue('')
    setMembers([])
    setError(null)
    dialogRef.current?.showModal()
  }

  // UserPicker is dumb/controlled -- this is where "typing/picking fills the
  // field" turns into "add them to the draft group and clear the field for
  // the next pick," same reusable component AddMemberDialog uses for its
  // single-field, form-submits-directly case.
  function handlePickerChange(value: string) {
    setPickerValue(value)
    const match = availableUsers.find((user) => user.email.toLowerCase() === value.trim().toLowerCase())
    if (match && !members.some((member) => member.userId === match.id)) {
      setMembers((prev) => [...prev, { userId: match.id, name: match.name, email: match.email, type: 'actor', part: '' }])
      setPickerValue('')
    }
  }

  function removeMember(userId: string) {
    setMembers((prev) => prev.filter((member) => member.userId !== userId))
  }

  function updateMemberType(userId: string, type: 'actor' | 'viewer') {
    setMembers((prev) => prev.map((member) => (member.userId === userId ? { ...member, type } : member)))
  }

  function updateMemberPart(userId: string, part: string) {
    setMembers((prev) => prev.map((member) => (member.userId === userId ? { ...member, part } : member)))
  }

  async function handleSubmit(formData: FormData) {
    setError(null)
    formData.set('title', title)
    formData.set('scriptSlug', scriptSlug)
    formData.set('members', JSON.stringify(members.map(({ userId, type, part }) => ({ userId, type, part }))))
    try {
      await createWorkshop(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  // Already-picked people drop out of the picker's own list -- picking them
  // again would just be confusing, and they're already visible below it.
  const remainingUsers = availableUsers.filter((user) => !members.some((member) => member.userId === user.id))

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="New workshop"
        title="New workshop"
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground transition-transform hover:-translate-y-0.5"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* Same <dialog> reasoning as add-member-dialog.tsx: no box styling
          directly on <dialog> (a click in its own padding would otherwise
          be mistaken for a backdrop click), and m-auto restores the
          centering Tailwind's preflight margin reset breaks. */}
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="m-auto max-w-md border-0 bg-transparent p-0 backdrop:bg-black/50"
      >
        <div className="w-full max-w-md rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground">
          <p className="text-lg font-semibold">New workshop</p>
          <p className="mt-1 text-sm text-ink-foreground/60">
            Only a title is required -- attach a script and add people now, or come back later.
          </p>

          <form action={handleSubmit} className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Title
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled workshop"
                className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground placeholder:text-ink-foreground/45 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Script <span className="text-ink-foreground/45">(optional)</span>
              <select
                value={scriptSlug}
                onChange={(e) => setScriptSlug(e.target.value)}
                className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground focus:outline-none"
              >
                <option value="">No script</option>
                {availableScripts.map((script) => (
                  <option key={script.slug} value={script.slug}>
                    {script.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-2 text-sm">
              <label className="flex flex-col gap-1">
                Add people <span className="text-ink-foreground/45">(optional)</span>
                <UserPicker availableUsers={remainingUsers} value={pickerValue} onChange={handlePickerChange} />
              </label>

              {members.length > 0 && (
                <div className="flex flex-col gap-2">
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-2 rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs">{member.name || member.email}</span>
                      <select
                        value={member.type}
                        onChange={(e) => updateMemberType(member.userId, e.target.value as 'actor' | 'viewer')}
                        className="rounded-md border border-ink-foreground/16 bg-ink-card px-1.5 py-1 text-xs text-ink-foreground"
                      >
                        <option value="actor">Actor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <input
                        value={member.part}
                        onChange={(e) => updateMemberPart(member.userId, e.target.value)}
                        placeholder="Part"
                        className="w-20 rounded-md border border-ink-foreground/16 bg-ink-card px-1.5 py-1 text-xs text-ink-foreground placeholder:text-ink-foreground/40"
                      />
                      <button
                        type="button"
                        onClick={() => removeMember(member.userId)}
                        aria-label={`Remove ${member.name || member.email}`}
                        className="text-ink-foreground/45 hover:text-[#f0a8b4]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-[#f0a8b4]">{error}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground"
              >
                Cancel
              </button>
              <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Create
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
}
