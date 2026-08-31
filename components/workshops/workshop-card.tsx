import Link from 'next/link'
import { WorkshopCardMenu } from '@/components/workshops/workshop-card-menu'
import type { AddableUser } from '@/lib/workshops/queries'
import type { ScriptSummary } from '@/lib/workshops/scripts'

function formatCardDate(date: Date | null) {
  if (!date) return null
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

export function WorkshopCard({
  id,
  title,
  scriptSlug,
  memberCount,
  rehearsalAt,
  selected,
  activeUsers,
  availableScripts,
}: {
  id: string
  title: string
  scriptSlug: string | null
  memberCount: number
  rehearsalAt: Date | null
  selected: boolean
  activeUsers: AddableUser[]
  availableScripts: ScriptSummary[]
}) {
  const date = formatCardDate(rehearsalAt)

  return (
    <div
      className={
        selected
          ? 'relative rounded-xl border-2 border-primary bg-ink-card px-4 py-3.5'
          : 'relative rounded-xl border border-ink-foreground/16 bg-ink-card px-4 py-3.5 transition-colors hover:border-ink-foreground/30'
      }
    >
      {/* The menu button below can't be a descendant of this Link -- nesting
          interactive elements inside an <a> is invalid HTML and unreliable
          across browsers -- so it's a positioned sibling instead. */}
      <Link href={`/workshops/${id}`} className="block pr-7">
        <p className="truncate text-[15px] font-semibold text-ink-foreground">{title}</p>
        <p className="mt-1 text-xs text-ink-foreground/55">
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
          {date ? ` · ${date}` : ''}
        </p>
      </Link>
      <div className="absolute right-3 top-3.5">
        <WorkshopCardMenu
          workshopId={id}
          title={title}
          scriptSlug={scriptSlug}
          memberCount={memberCount}
          rehearsalAt={rehearsalAt}
          activeUsers={activeUsers}
          availableScripts={availableScripts}
        />
      </div>
    </div>
  )
}
