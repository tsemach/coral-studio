'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      aria-label="Refresh pending users"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border text-foreground/60 transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-50"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`}
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
    </button>
  )
}
