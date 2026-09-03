'use client'

import { useRef, useState } from 'react'
import { uploadScript } from '@/app/scripts/actions'

// Two independent instances render this (sidebar "+" and the top toolbar's
// "+ Add script"), each with its own <dialog> -- simpler than lifting a
// shared ref up to a common parent (see workshop-card-menu.tsx for that
// pattern) since, unlike per-workshop dialogs, there's exactly one upload
// action and only one instance is ever open at a time.
export function AddScriptDialog({ compact = false }: { compact?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function open() {
    setError(null)
    dialogRef.current?.showModal()
  }

  async function handleSubmit(formData: FormData) {
    setError(null)
    setPending(true)
    try {
      const result = await uploadScript(formData)
      if (result && 'error' in result) {
        setError(result.error)
        return
      }
      formRef.current?.reset()
      dialogRef.current?.close()
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Add script"
        className={
          compact
            ? 'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border border-ink-foreground/16 text-ink-foreground/70 transition-colors hover:border-ink-foreground/30 hover:text-ink-foreground'
            : 'inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5'
        }
      >
        {compact ? '+' : '+ Add script'}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="m-auto max-w-sm border-0 bg-transparent p-0 backdrop:bg-black/50"
      >
        <div className="w-full max-w-sm rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground">
          <p className="text-lg font-semibold">Add a script</p>
          <p className="mt-1 text-sm text-ink-foreground/60">
            Upload a JSON file matching the script schema (title, scene, script_flow).
          </p>

          <form ref={formRef} action={handleSubmit} className="mt-5 flex flex-col gap-3">
            <input
              type="file"
              name="file"
              accept="application/json,.json"
              required
              className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground file:mr-3 file:rounded-md file:border-0 file:bg-ink-foreground/10 file:px-3 file:py-1.5 file:text-ink-foreground"
            />

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
                disabled={pending}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                {pending ? 'Uploading…' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
}
