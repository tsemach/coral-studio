'use client'

import { useRef } from 'react'
import { deleteUser } from '@/app/admin/users/actions'

export function DeleteUserButton({ userId, label }: { userId: string; label: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="shrink-0 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
      >
        Delete
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="w-full max-w-sm rounded-sm border border-border bg-card p-6 text-foreground backdrop:bg-foreground/40"
      >
        <p className="font-serif text-lg font-semibold">Delete user?</p>
        <p className="mt-2 text-sm text-foreground/70">
          Delete <span className="font-medium text-foreground">{label}</span>? This permanently removes their
          account and cannot be undone.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-sm border border-border px-4 py-2 text-sm font-semibold text-foreground/70 transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <form action={deleteUser.bind(null, userId)}>
            <button
              type="submit"
              className="rounded-sm bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Delete
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}
