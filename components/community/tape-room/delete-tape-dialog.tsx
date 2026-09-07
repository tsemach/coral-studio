'use client'

import { useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTape } from '@/app/community/tape-actions'
import { useTranslation } from '@/components/i18n/language-provider'

export function DeleteTapeDialog({ tapeId }: { tapeId: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTape(tapeId)
      dialogRef.current?.close()
      router.push('/community')
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
      >
        {t.community.deleteTape.trigger}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="m-auto w-full max-w-sm border-0 bg-transparent p-4 backdrop:bg-black/60 [color-scheme:dark]"
      >
        <div className="w-full rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground shadow-2xl">
          <p className="text-lg font-semibold text-ink-foreground">{t.community.deleteTape.title}</p>
          <p className="mt-1 text-sm text-ink-foreground/60">{t.community.deleteTape.body}</p>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground cursor-pointer"
            >
              {t.community.deleteTape.cancel}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="rounded-xl bg-red-800 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? t.community.deleteTape.deleting : t.community.deleteTape.delete}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
