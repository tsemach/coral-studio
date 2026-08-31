'use client'

import { useCallback, useRef, useState } from 'react'
import { setWorkshopScript } from '@/app/workshops/actions'
import { ScriptFlow } from '@/components/workshops/script-flow'
import type { Script, ScriptSummary } from '@/lib/workshops/scripts'

const DEFAULT_WIDTH = 380
const MIN_WIDTH = 280
const MAX_WIDTH = 1100

export function ScriptPanel({
  workshopId,
  script,
  availableScripts,
}: {
  workshopId: string
  script: Script | null
  availableScripts: ScriptSummary[]
}) {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  // Same pointer-capture approach as workshop-sidebar-list.tsx's resize
  // handle, mirrored: this handle sits on the panel's LEFT edge, so growing
  // the panel means dragging left (negative deltaX), the opposite sign from
  // the sidebar's right-edge handle.
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragRef.current = { startX: e.clientX, startWidth: width }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [width]
  )

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const next = dragRef.current.startWidth - (e.clientX - dragRef.current.startX)
    setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)))
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  return (
    <div
      className="relative flex min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-ink-foreground/12 bg-ink"
      style={{ width }}
    >
      {/* Same generous 20px hit target + hover-revealed grip as the
          sidebar's handle, mirrored onto the left edge. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize script panel"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="group absolute top-0 -left-2.5 z-10 flex h-full w-5 cursor-col-resize touch-none items-center justify-center"
      >
        <div className="h-full w-px bg-ink-foreground/16 transition-colors group-hover:bg-ink-foreground/35" />
        <div className="pointer-events-none absolute h-10 w-1.5 rounded-full bg-ink-foreground/70 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="shrink-0 px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/55">Script</p>
        <p className="mt-0.5 text-[15px] font-semibold">{script ? script.title : 'No script attached'}</p>
      </div>

      {/* min-h-0 is the piece that was actually missing: a flex item's
          default min-height:auto refuses to shrink below its content's
          size, which silently defeats overflow-y-auto -- the panel just
          grew to fit the script instead of scrolling. overscroll-contain
          stops wheel scrolling from chaining to the page once this reaches
          its own top/bottom -- the page never moves. The three scrollbar
          rules hide the scrollbar (per-browser: no shorthand covers
          Firefox, WebKit, and old Edge/IE at once) while the element stays
          scrollable -- wheel/trackpad/keyboard scrolling still works, just
          without a visible track. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-ink-foreground/14 px-5 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {script ? (
          <ScriptFlow script={script} />
        ) : availableScripts.length === 0 ? (
          <p className="text-sm text-ink-foreground/55">No scripts are available to attach yet.</p>
        ) : (
          <form action={setWorkshopScript.bind(null, workshopId)} className="flex flex-col gap-3">
            <p className="text-sm text-ink-foreground/55">Attach a script to render it here.</p>
            <select
              name="scriptSlug"
              defaultValue=""
              required
              className="rounded-lg border border-ink-foreground/16 bg-ink-card px-3 py-2 text-sm text-ink-foreground"
            >
              <option value="" disabled>
                Choose a script
              </option>
              {availableScripts.map((available) => (
                <option key={available.slug} value={available.slug}>
                  {available.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="self-start rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Attach
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
