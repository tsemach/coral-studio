'use client'

import { useRef } from 'react'
import { cancelRehearsal } from '@/app/workshops/actions'

// Same <dialog> + backdrop-click-to-close pattern as
// schedule-rehearsal-dialog.tsx/add-member-dialog.tsx -- this is the one
// destructive action in workshops that reaches outside the workshop itself
// (it emails every invited actor a cancellation), so unlike leaveWorkshop/
// deleteWorkshop it gets a confirm step rather than firing straight off the
// icon click.
export function CancelRehearsalButton({ workshopId }: { workshopId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Cancel rehearsal"
        title="Cancel rehearsal"
        className="flex h-4 w-4 items-center justify-center rounded-md text-[10px] text-ink-foreground/40 transition-colors hover:bg-ink-foreground/10 hover:text-ink-foreground"
      >
        ✕
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="m-auto max-w-sm border-0 bg-transparent p-0 backdrop:bg-black/50"
      >
        <div className="w-full max-w-sm rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground">
          <p className="text-lg font-semibold">Cancel rehearsal?</p>
          <p className="mt-1 text-sm text-ink-foreground/60">
            This clears the scheduled date and sends a cancellation notice to everyone who was invited.
          </p>

          <form
            action={async () => {
              await cancelRehearsal(workshopId)
              dialogRef.current?.close()
            }}
            className="mt-5 flex justify-end gap-2"
          >
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground"
            >
              Keep it
            </button>
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Cancel rehearsal
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}
