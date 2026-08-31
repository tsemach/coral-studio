import Link from 'next/link'
import { UserMenu } from '@/components/user-menu'
import { WorkshopSidebarList } from '@/components/workshops/workshop-sidebar-list'
import type { WorkshopDetail, WorkshopListItem } from '@/lib/workshops/queries'

// Server Component -- only the search filter (workshop-sidebar-list.tsx) needs
// to be a Client Component; everything else here renders on the server.
export function WorkshopShell({
  workshops,
  selected,
}: {
  workshops: WorkshopListItem[]
  selected: WorkshopDetail
}) {
  return (
    <div className="flex min-h-screen flex-col bg-ink text-ink-foreground">
      <div className="flex items-center justify-between border-b border-ink-foreground/16 px-8 py-[18px]">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            aria-label="Back to site"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-foreground/16 text-ink-foreground/55 transition-colors hover:border-ink-foreground/30 hover:text-ink-foreground"
          >
            ←
          </Link>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-foreground/55">Workshops</p>
            <p className="mt-0.5 text-[21px] font-semibold tracking-tight">Rehearsal Room</p>
          </div>
        </div>
        <UserMenu />
      </div>

      <div className="flex flex-1">
        <WorkshopSidebarList workshops={workshops} selectedId={selected.id} />

        <div className="flex-1 px-8 py-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-foreground/55">
            Selected workshop
          </p>
          <h1 className="mt-1 text-[27px] font-semibold tracking-tight">{selected.title}</h1>
          <p className="mt-6 text-sm text-ink-foreground/55">
            Group, rehearsal, and script details are coming in the next PRs.
          </p>
        </div>
      </div>
    </div>
  )
}
