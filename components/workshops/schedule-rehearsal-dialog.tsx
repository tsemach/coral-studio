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

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="w-full max-w-sm rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground backdrop:bg-black/50"
      >
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
      </dialog>
    </>
  )
})
