'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'
import { setRehearsalDate } from '@/app/workshops/actions'
import type { DialogHandle } from '@/components/workshops/add-member-dialog'

function formatRehearsalInputValue(date: Date | null) {
  if (!date) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Same forwardRef + hideTrigger reasoning as add-member-dialog.tsx.
export const ScheduleRehearsalDialog = forwardRef<
  DialogHandle,
  { workshopId: string; rehearsalAt: Date | null; hideTrigger?: boolean }
>(function ScheduleRehearsalDialog({ workshopId, rehearsalAt, hideTrigger }, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  function open() {
    dialogRef.current?.showModal()
  }

  useImperativeHandle(ref, () => ({ open }))

  return (
    <>
      {!hideTrigger && (
        <button
          type="button"
          onClick={open}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-foreground/16 px-4 py-2.5 text-sm font-semibold text-ink-foreground transition-colors hover:border-ink-foreground/30"
        >
          Schedule Rehearsal
        </button>
      )}

      {/* The <dialog> element itself has no padding/box styling -- if it
          did, a click landing in that padding (e.g. dismissing the native
          datetime-local picker) would register as e.target === the dialog
          itself, the same test used to detect a true backdrop click, and
          close the dialog before Save is reachable. The visual card lives
          on an inner div instead, so only an actual backdrop click closes it.
          m-auto: Tailwind's preflight resets margin to 0 globally, which
          knocks out the browser default `margin: auto` a modal <dialog>
          relies on for centering -- without this it renders pinned to the
          top-left of the viewport instead of centered. */}
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="m-auto max-w-sm border-0 bg-transparent p-0 backdrop:bg-black/50"
      >
        <div className="w-full max-w-sm rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground">
          <p className="text-lg font-semibold">Schedule rehearsal</p>
          <p className="mt-1 text-sm text-ink-foreground/60">Set when this workshop&apos;s group next meets.</p>

          <form
            action={async (formData) => {
              await setRehearsalDate(workshopId, formData)
              dialogRef.current?.close()
            }}
            className="mt-5 flex flex-col gap-3"
          >
            <input
              type="datetime-local"
              name="rehearsalAt"
              defaultValue={formatRehearsalInputValue(rehearsalAt)}
              className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground [color-scheme:dark] focus:outline-none"
            />

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground"
              >
                Cancel
              </button>
              <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Save
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
})
