'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { ReaderStatus } from '@/lib/community/types'

const CHANNELS: { id: string; label: string; description: string; badge?: string }[] = [
  { id: 'all', label: 'All Channels', description: 'Everything from across the studio' },
  { id: 'reader_sos', label: '#reader-sos', description: 'Urgent scene partners & line reading', badge: 'Active' },
  { id: 'callboard', label: '#the-callboard', description: 'Belgrade auditions, student films & crew' },
  { id: 'craft_chat', label: '#craft-chat', description: 'Acting technique, scene analysis & questions' },
  { id: 'general', label: '#general', description: 'Studio news & discussions' },
]

export function ChannelTabs() {
  const searchParams = useSearchParams()
  const activeChannel = searchParams.get('channel') || 'all'
  const activeStatus = searchParams.get('status') as ReaderStatus | null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-foreground/16 pb-3">
        {CHANNELS.map((ch) => {
          const isActive = activeChannel === ch.id
          const href = ch.id === 'all' ? '/community' : `/community?channel=${ch.id}`

          return (
            <Link
              key={ch.id}
              href={href}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-ink-card text-ink-foreground/70 hover:bg-ink-foreground/5 hover:border-ink-foreground/30 hover:text-ink-foreground border border-ink-foreground/16'
              }`}
            >
              <span>{ch.label}</span>
              {ch.badge && !isActive && (
                <span className="rounded-full bg-ink-foreground/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-ink-foreground/75">
                  {ch.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {activeChannel === 'reader_sos' && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-ink-foreground/55 font-medium">Filter status:</span>
          <Link
            href="/community?channel=reader_sos"
            className={`rounded-lg px-2.5 py-1 transition-colors ${
              !activeStatus
                ? 'bg-ink-foreground/15 text-ink-foreground font-medium'
                : 'text-ink-foreground/55 hover:text-ink-foreground'
            }`}
          >
            All Requests
          </Link>
          <Link
            href="/community?channel=reader_sos&status=seeking"
            className={`rounded-lg px-2.5 py-1 transition-colors ${
              activeStatus === 'seeking'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 font-medium'
                : 'text-ink-foreground/55 hover:text-ink-foreground'
            }`}
          >
            Seeking Reader Only
          </Link>
          <Link
            href="/community?channel=reader_sos&status=matched"
            className={`rounded-lg px-2.5 py-1 transition-colors ${
              activeStatus === 'matched'
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-medium'
                : 'text-ink-foreground/55 hover:text-ink-foreground'
            }`}
          >
            Matched
          </Link>
        </div>
      )}
    </div>
  )
}
