'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AddScriptDialog } from '@/components/scripts/add-script-dialog'
import { ScriptCardMenu } from '@/components/scripts/script-card-menu'
import type { ScriptSummary } from '@/lib/workshops/scripts'

// No resize handle, unlike workshop-sidebar-list.tsx -- not in the COR-17
// sketch and not asked for; a fixed width keeps this smaller and avoids
// scope creep beyond the issue.
const WIDTH = 320

export function ScriptsSidebarList({ scripts, selectedSlug }: { scripts: ScriptSummary[]; selectedSlug: string | null }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return scripts
    return scripts.filter((script) => script.title.toLowerCase().includes(q))
  }, [scripts, query])

  return (
    <div className="flex h-full min-h-0 shrink-0 flex-col gap-4 p-6" style={{ width: WIDTH }}>
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
            placeholder="Search scripts"
            className="h-[38px] w-full rounded-[10px] border border-ink-foreground/16 bg-ink pl-[34px] pr-3 text-[13.5px] text-ink-foreground placeholder:text-ink-foreground/45 focus:outline-none"
          />
        </div>
        <AddScriptDialog compact />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-1 text-sm text-ink-foreground/55">
            {scripts.length === 0 ? 'No scripts uploaded yet.' : `No scripts match "${query}".`}
          </p>
        ) : (
          filtered.map((script) => (
            <div
              key={script.slug}
              className={
                script.slug === selectedSlug
                  ? 'relative rounded-xl border-2 border-primary bg-ink-card px-4 py-3.5'
                  : 'relative rounded-xl border border-ink-foreground/16 bg-ink-card px-4 py-3.5 transition-colors hover:border-ink-foreground/30'
              }
            >
              {/* Same reasoning as workshop-card.tsx: the kebab menu can't be
                  a descendant of this Link (nested interactive elements are
                  invalid HTML), so it's a positioned sibling. */}
              <Link href={`/scripts/${script.slug}`} className="block pr-7">
                <p className="truncate text-[15px] font-semibold text-ink-foreground">{script.title}</p>
                <p className="mt-1 truncate text-xs text-ink-foreground/55">{script.scene}</p>
              </Link>
              <div className="absolute right-3 top-3.5">
                <ScriptCardMenu slug={script.slug} title={script.title} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
