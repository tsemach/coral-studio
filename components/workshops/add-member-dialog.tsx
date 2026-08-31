'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { addMember } from '@/app/workshops/actions'
import type { AddableUser } from '@/lib/workshops/queries'

export type DialogHandle = { open: () => void }

// forwardRef + hideTrigger: this dialog is used both as a standalone button
// (top bar) and as a menu item inside WorkshopCardMenu's dropdown. In the
// menu case, the <dialog> must be mounted outside the dropdown's own
// conditional render -- a <dialog> opened via showModal() force-closes the
// instant it (or an ancestor) stops being rendered, which the dropdown does
// the moment it's clicked closed.
export const AddMemberDialog = forwardRef<
  DialogHandle,
  { workshopId: string; availableUsers: AddableUser[]; hideTrigger?: boolean }
>(function AddMemberDialog({ workshopId, availableUsers, hideTrigger }, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [error, setError] = useState<string | null>(null)

    function open() {
      setError(null)
      dialogRef.current?.showModal()
    }

    useImperativeHandle(ref, () => ({ open }))

    async function handleSubmit(formData: FormData) {
      setError(null)
      try {
        await addMember(workshopId, formData)
        dialogRef.current?.close()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    }

    return (
      <>
        {!hideTrigger && (
          <button
            type="button"
            onClick={open}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            + Add user
          </button>
        )}

        {/* No padding/box styling directly on <dialog> -- see
            schedule-rehearsal-dialog.tsx for why a click in that padding
            would otherwise be mistaken for a backdrop click and close it.
            m-auto restores the centering Tailwind's preflight margin reset
            otherwise breaks (see schedule-rehearsal-dialog.tsx). */}
        <dialog
          ref={dialogRef}
          onClick={(e) => {
            if (e.target === dialogRef.current) dialogRef.current?.close()
          }}
          className="m-auto max-w-sm border-0 bg-transparent p-0 backdrop:bg-black/50"
        >
          <div className="w-full max-w-sm rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground">
            <p className="text-lg font-semibold">Add a member</p>
            <p className="mt-1 text-sm text-ink-foreground/60">Pick an existing, active user to add to the group.</p>

            <form action={handleSubmit} className="mt-5 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                User
                {availableUsers.length === 0 ? (
                  <select
                    disabled
                    className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground/45"
                  >
                    <option>No other active users available</option>
                  </select>
                ) : (
                  <select
                    name="email"
                    required
                    defaultValue=""
                    className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground focus:outline-none"
                  >
                    <option value="" disabled>
                      Choose a user
                    </option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.email}>
                        {user.name ? `${user.name} — ${user.email}` : user.email}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Type
                <select
                  name="type"
                  defaultValue="actor"
                  className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground focus:outline-none"
                >
                  <option value="actor">Actor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Part <span className="text-ink-foreground/45">(optional)</span>
                <input
                  type="text"
                  name="part"
                  className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground focus:outline-none"
                />
              </label>

              {error && <p className="text-sm text-[#f0a8b4]">{error}</p>}

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={availableUsers.length === 0}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </dialog>
      </>
    )
  }
)
