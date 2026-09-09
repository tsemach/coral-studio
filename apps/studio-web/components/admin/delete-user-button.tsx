'use client'

import { useRef } from 'react'
import { deleteUser } from '@/app/admin/users/actions'
import { useTranslation } from '@/components/i18n/language-provider'

export function DeleteUserButton({ userId, label }: { userId: string; label: string }) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="shrink-0 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
      >
        {t.admin.deleteUserButton.delete}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-foreground backdrop:bg-foreground/40"
      >
        <p className="font-serif text-lg font-semibold">{t.admin.deleteUserButton.confirmTitle}</p>
        <p className="mt-2 text-sm text-foreground/70">
          {t.admin.deleteUserButton.confirmBodyPrefix}{' '}
          <span className="font-medium text-foreground">{label}</span>?{' '}
          {t.admin.deleteUserButton.confirmBodySuffix}
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground/70 transition-colors hover:text-foreground"
          >
            {t.admin.deleteUserButton.cancel}
          </button>
          <form action={deleteUser.bind(null, userId)}>
            <button
              type="submit"
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              {t.admin.deleteUserButton.delete}
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}
