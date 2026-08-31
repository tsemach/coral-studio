'use client'

import { useMemo, useState } from 'react'
import { createWorkshop } from '@/app/workshops/actions'
import { WorkshopCard } from '@/components/workshops/workshop-card'
import type { WorkshopListItem } from '@/lib/workshops/queries'

export function WorkshopSidebarList({
  workshops,
  selectedId,
}: {
  workshops: WorkshopListItem[]
  selectedId: string | null
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return workshops
    return workshops.filter((workshop) => workshop.title.toLowerCase().includes(q))
  }, [workshops, query])

  return (
    <div className="flex w-80 shrink-0 flex-col gap-4 border-r border-ink-foreground/16 p-6">
      <div className="flex items-center gap-2.5">
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
        <form action={createWorkshop}>
          <button
            type="submit"
            aria-label="New workshop"
            title="New workshop"
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <p className="px-1 text-sm text-ink-foreground/55">No workshops match &ldquo;{query}&rdquo;.</p>
        ) : (
          filtered.map((workshop) => (
            <WorkshopCard
              key={workshop.id}
              id={workshop.id}
              title={workshop.title}
              memberCount={workshop.memberCount}
              rehearsalAt={workshop.rehearsalAt}
              selected={workshop.id === selectedId}
            />
          ))
        )}
      </div>
    </div>
  )
}
