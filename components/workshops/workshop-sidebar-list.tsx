'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { WorkshopFormDialog } from '@/components/workshops/workshop-form-dialog'
import { WorkshopCard } from '@/components/workshops/workshop-card'
import type { AddableUser, WorkshopListItem } from '@/lib/workshops/queries'
import type { ScriptSummary } from '@/lib/workshops/scripts'

const DEFAULT_WIDTH = 320
const MIN_WIDTH = 260
const MAX_WIDTH = 480

export function WorkshopSidebarList({
  workshops,
  selectedId,
  activeUsers,
  availableScripts,
}: {
  workshops: WorkshopListItem[]
  selectedId: string | null
  activeUsers: AddableUser[]
  availableScripts: ScriptSummary[]
}) {
  const [query, setQuery] = useState('')
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return workshops
    return workshops.filter((workshop) => workshop.title.toLowerCase().includes(q))
  }, [workshops, query])

  // Pointer capture (not window mousemove/mouseup listeners) keeps receiving
  // move/up events for this pointer even once the cursor leaves the handle's
  // small hit area mid-drag -- no manual add/removeEventListener cleanup.
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragRef.current = { startX: e.clientX, startWidth: width }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [width]
  )

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const next = dragRef.current.startWidth + (e.clientX - dragRef.current.startX)
    setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)))
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  return (
    <div className="relative flex h-full min-h-0 shrink-0 flex-col gap-4 p-6" style={{ width }}>
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-foreground/45"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workshops"
            className="h-[38px] w-full rounded-[10px] border border-ink-foreground/16 bg-ink pl-[34px] pr-3 text-[13.5px] text-ink-foreground placeholder:text-ink-foreground/45 focus:outline-none"
          />
        </div>
        <WorkshopFormDialog mode="create" availableUsers={activeUsers} availableScripts={availableScripts} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-1 text-sm text-ink-foreground/55">No workshops match &ldquo;{query}&rdquo;.</p>
        ) : (
          filtered.map((workshop) => (
            <WorkshopCard
              key={workshop.id}
              id={workshop.id}
              title={workshop.title}
              scriptSlug={workshop.scriptSlug}
              memberCount={workshop.memberCount}
              memberUserIds={workshop.memberUserIds}
              rehearsalAt={workshop.rehearsalAt}
              selected={workshop.id === selectedId}
              activeUsers={activeUsers}
              availableScripts={availableScripts}
            />
          ))
        )}
      </div>

      {/* A generous 20px hit target straddling the actual boundary, not just
          a 1px line -- the visible track (thin line) and the grip mark are
          both purely decorative children so the drag math above only has to
          reason about this one element's pointer events. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize workshop list"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="group absolute top-0 -right-2.5 flex h-full w-5 cursor-col-resize touch-none items-center justify-center"
      >
        <div className="h-full w-px bg-ink-foreground/16 transition-colors group-hover:bg-ink-foreground/35" />
        {/* Hidden until the line is actually hovered -- it's a drag
            affordance the pointer reveals, not a permanent fixture. */}
        <div className="pointer-events-none absolute h-10 w-1.5 rounded-full bg-ink-foreground/70 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </div>
  )
}
