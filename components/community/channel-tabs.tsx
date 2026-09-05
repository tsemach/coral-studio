'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

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
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
        {CHANNELS.map((ch) => {
          const isActive = activeChannel === ch.id
          const href = ch.id === 'all' ? '/community' : `/community?channel=${ch.id}`

          return (
            <Link
              key={ch.id}
              href={href}
              className={`inline-flex items-center gap-2 rounded-sm px-3.5 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card text-foreground/80 hover:bg-foreground/5 hover:text-foreground border border-border/60'
              }`}
            >
              <span>{ch.label}</span>
              {ch.badge && !isActive && (
                <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[0.65rem] font-semibold text-accent-foreground">
                  {ch.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {activeChannel === 'reader_sos' && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted font-medium">Filter status:</span>
          <Link
            href="/community?channel=reader_sos"
            className={`rounded-sm px-2.5 py-1 transition-colors ${
              !activeStatus
                ? 'bg-foreground/15 text-foreground font-medium'
                : 'text-muted hover:text-foreground'
            }`}
          >
            All Requests
          </Link>
          <Link
            href="/community?channel=reader_sos&status=seeking"
            className={`rounded-sm px-2.5 py-1 transition-colors ${
              activeStatus === 'seeking'
                ? 'bg-amber-500/20 text-amber-900 font-medium'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Seeking Reader Only
          </Link>
          <Link
            href="/community?channel=reader_sos&status=matched"
            className={`rounded-sm px-2.5 py-1 transition-colors ${
              activeStatus === 'matched'
                ? 'bg-emerald-500/20 text-emerald-900 font-medium'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Matched
          </Link>
        </div>
      )}
    </div>
  )
}
