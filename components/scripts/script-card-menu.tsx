'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { removeScript } from '@/app/scripts/actions'

export function ScriptCardMenu({ slug, title }: { slug: string; title: string }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const deleteDialogRef = useRef<HTMLDialogElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleDelete() {
    await removeScript(slug)
    deleteDialogRef.current?.close()
    router.push('/scripts')
    router.refresh()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="Script options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-ink-foreground/55 hover:bg-ink hover:text-ink-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.8"></circle>
          <circle cx="12" cy="12" r="1.8"></circle>
          <circle cx="12" cy="19" r="1.8"></circle>
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-[calc(100%+6px)] z-10 w-[160px] rounded-lg border border-ink-foreground/16 bg-ink-card py-1 shadow-lg"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              deleteDialogRef.current?.showModal()
            }}
            className="block w-full px-4 py-2 text-left text-[13.5px] font-medium text-[#f0a8b4] hover:bg-ink"
          >
            Delete
          </button>
        </div>
      )}

      <dialog
        ref={deleteDialogRef}
        onClick={(e) => {
          if (e.target === deleteDialogRef.current) deleteDialogRef.current?.close()
        }}
        className="m-auto max-w-sm border-0 bg-transparent p-0 backdrop:bg-black/50"
      >
        <div className="w-full max-w-sm rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground">
          <p className="text-lg font-semibold">Delete script?</p>
          <p className="mt-2 text-sm text-ink-foreground/60">
            Delete <span className="font-medium text-ink-foreground">{title}</span>? Any workshop
            with it attached will show &ldquo;no script attached&rdquo; afterward. This cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => deleteDialogRef.current?.close()}
              className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Delete
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
