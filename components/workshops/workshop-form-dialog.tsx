'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { createWorkshop, updateWorkshop } from '@/app/workshops/actions'
import { UserPicker } from '@/components/workshops/user-picker'
import type { AddableUser } from '@/lib/workshops/queries'
import type { ScriptSummary } from '@/lib/workshops/scripts'

export type DialogHandle = { open: () => void }

type DraftMember = { userId: string; name: string | null; email: string; type: 'actor' | 'viewer'; part: string }

type WorkshopFormDialogProps = {
  availableUsers: AddableUser[]
  availableScripts: ScriptSummary[]
  hideTrigger?: boolean
} & (
  | { mode: 'create' }
  | { mode: 'edit'; workshopId: string; initialTitle: string; initialScriptSlug: string | null }
)

// One reusable dialog backs both "+ New workshop" (the sidebar) and "Edit"
// (each card's kebab menu, first item) -- same title/script/add-people
// fields, only the heading/button copy and which Server Action gets called
// differ. forwardRef + hideTrigger for the same reason as add-member-dialog/
// schedule-rehearsal-dialog: Edit is only ever triggered from inside
// WorkshopCardMenu's dropdown, whose own showModal()-force-close-on-unmount
// problem needs this dialog mounted outside that conditional render.
export const WorkshopFormDialog = forwardRef<DialogHandle, WorkshopFormDialogProps>(function WorkshopFormDialog(
  props,
  ref
) {
  const { availableUsers, availableScripts, hideTrigger } = props
  const isEdit = props.mode === 'edit'
  const workshopId = props.mode === 'edit' ? props.workshopId : null
  const initialTitle = props.mode === 'edit' ? props.initialTitle : ''
  const initialScriptSlug = props.mode === 'edit' ? props.initialScriptSlug : null

  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState('')
  const [scriptSlug, setScriptSlug] = useState('')
  const [members, setMembers] = useState<DraftMember[]>([])
  const [error, setError] = useState<string | null>(null)

  function open() {
    setTitle(initialTitle)
    setScriptSlug(initialScriptSlug ?? '')
    setMembers([])
    setError(null)
    dialogRef.current?.showModal()
  }

  useImperativeHandle(ref, () => ({ open }))

  // UserPicker is dumb/controlled -- this is where "picking a user" turns
  // into "add them to the draft group." Always passing selected={null} back
  // in (never feeding a pick back as UserPicker's `selected`) is what makes
  // the control reset to its placeholder after every pick.
  function handlePick(user: AddableUser) {
    if (members.some((member) => member.userId === user.id)) return
    setMembers((prev) => [...prev, { userId: user.id, name: user.name, email: user.email, type: 'actor', part: '' }])
  }

  function removeMember(userId: string) {
    setMembers((prev) => prev.filter((member) => member.userId !== userId))
  }

  function updateMemberType(userId: string, type: 'actor' | 'viewer') {
    // Clear part, not just disable its field -- unlike a plain form submit,
    // this state gets serialized to JSON regardless of the input's disabled
    // attribute, so a stale leftover part would otherwise still get sent.
    setMembers((prev) =>
      prev.map((member) => (member.userId === userId ? { ...member, type, part: type === 'viewer' ? '' : member.part } : member))
    )
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
      if (isEdit && workshopId) {
        await updateWorkshop(workshopId, formData)
        dialogRef.current?.close()
      } else {
        await createWorkshop(formData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  // Already-picked people drop out of the picker's own list -- picking them
  // again would just be confusing, and they're already visible below it.
  const remainingUsers = availableUsers.filter((user) => !members.some((member) => member.userId === user.id))

  return (
    <>
      {!hideTrigger && (
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
      )}

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
          <p className="text-lg font-semibold">{isEdit ? 'Edit workshop' : 'New workshop'}</p>
          <p className="mt-1 text-sm text-ink-foreground/60">
            {isEdit
              ? 'Update the title or script, or add more people to the group.'
              : 'Only a title is required -- attach a script and add people now, or come back later.'}
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
                <UserPicker availableUsers={remainingUsers} selected={null} onSelect={handlePick} placeholder="Add a person…" />
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
                        disabled={member.type === 'viewer'}
                        className="w-20 rounded-md border border-ink-foreground/16 bg-ink-card px-1.5 py-1 text-xs text-ink-foreground placeholder:text-ink-foreground/40 disabled:opacity-40"
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
                {isEdit ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
})
