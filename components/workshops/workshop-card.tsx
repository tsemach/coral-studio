import Link from 'next/link'

function formatCardDate(date: Date | null) {
  if (!date) return null
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

export function WorkshopCard({
  id,
  title,
  memberCount,
  rehearsalAt,
  selected,
}: {
  id: string
  title: string
  memberCount: number
  rehearsalAt: Date | null
  selected: boolean
}) {
  const date = formatCardDate(rehearsalAt)

  return (
    <Link
      href={`/workshops/${id}`}
      className={
        selected
          ? 'block rounded-xl border-2 border-primary bg-ink-card px-4 py-3.5'
          : 'block rounded-xl border border-ink-foreground/16 bg-ink-card px-4 py-3.5 transition-colors hover:border-ink-foreground/30'
      }
    >
      <p className="truncate text-[15px] font-semibold text-ink-foreground">{title}</p>
      <p className="mt-1 text-xs text-ink-foreground/55">
        {memberCount} {memberCount === 1 ? 'member' : 'members'}
        {date ? ` · ${date}` : ''}
      </p>
    </Link>
  )
}
