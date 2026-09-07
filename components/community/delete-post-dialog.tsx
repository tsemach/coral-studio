'use client'

import { useRef } from 'react'
import { useDeletePost } from '@/hooks/community/use-delete-post'
import { useTranslation } from '@/components/i18n/language-provider'

export function DeletePostDialog({ postId }: { postId: string }) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const mutation = useDeletePost()

  const handleDelete = () => {
    mutation.mutate(postId, { onSuccess: () => dialogRef.current?.close() })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
      >
        {t.community.deletePost.trigger}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="m-auto w-full max-w-sm border-0 bg-transparent p-4 backdrop:bg-black/60 [color-scheme:dark]"
      >
        <div className="w-full rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground shadow-2xl">
          <p className="text-lg font-semibold text-ink-foreground">{t.community.deletePost.title}</p>
          <p className="mt-1 text-sm text-ink-foreground/60">{t.community.deletePost.body}</p>

          {mutation.isError && (
            <p className="mt-3 rounded-lg bg-red-500/15 border border-red-500/30 p-2.5 text-xs text-red-200">
              {mutation.error.message}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground cursor-pointer"
            >
              {t.community.deletePost.cancel}
            </button>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={handleDelete}
              className="rounded-xl bg-red-800 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              {mutation.isPending ? t.community.deletePost.deleting : t.community.deletePost.delete}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
