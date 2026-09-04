'use client'

import { useEffect, useState } from 'react'
import { useWorkshopLive } from '@/components/workshops/workshop-live-area'

const POLL_INTERVAL_MS = 8000

// Opt-in per member (COR-18): this only starts the video view locally for
// whoever clicks it. Other members keep seeing WorkshopMain until they press
// this same button themselves -- polling live-status is what turns it into
// "Live now Â· Join" for them once someone else is already in the room.
export function GoLiveButton({ workshopId }: { workshopId: string }) {
  const { goLive } = useWorkshopLive()
  const [live, setLive] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(`/workshops/${workshopId}/live-status`, { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { live?: boolean }
        if (!cancelled) setLive(Boolean(data.live))
      } catch {
        // best-effort -- a failed poll just leaves the indicator as it was
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [workshopId])

  return (
    <button
      type="button"
      onClick={goLive}
      className={
        live
          ? 'inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground'
          : 'inline-flex items-center gap-2 rounded-xl border border-ink-foreground/16 px-4 py-2.5 text-sm font-semibold text-ink-foreground transition-colors hover:border-ink-foreground/30'
      }
    >
      {live && <span className="h-2 w-2 rounded-full bg-[#f0a8b4]" aria-hidden />}
      {live ? 'Live · Join' : 'Go live'}
    </button>
  )
}
