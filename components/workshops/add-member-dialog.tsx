'use client'

import { useRef, useState } from 'react'
import { addMember } from '@/app/workshops/actions'

export function AddMemberDialog({ workshopId }: { workshopId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState<string | null>(null)

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
      <button
        type="button"
        onClick={() => {
          setError(null)
          dialogRef.current?.showModal()
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
      >
        + Add user
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="w-full max-w-sm rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground backdrop:bg-black/50"
      >
        <p className="text-lg font-semibold">Add a member</p>
        <p className="mt-1 text-sm text-ink-foreground/60">
          Add an existing, active user by email. They&apos;ll appear in the group immediately.
        </p>

        <form action={handleSubmit} className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              name="email"
              required
              className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground focus:outline-none"
            />
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
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Add
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
