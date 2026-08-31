import Link from 'next/link'
import { UserMenu } from '@/components/user-menu'
import { AddMemberDialog } from '@/components/workshops/add-member-dialog'
import { ScheduleRehearsalDialog } from '@/components/workshops/schedule-rehearsal-dialog'
import { ScriptPanel } from '@/components/workshops/script-panel'
import { WorkshopDetailsPanel } from '@/components/workshops/workshop-details-panel'
import { WorkshopSidebarList } from '@/components/workshops/workshop-sidebar-list'
import type { WorkshopDetail, WorkshopListItem } from '@/lib/workshops/queries'
import type { Script, ScriptSummary } from '@/lib/workshops/scripts'

// Server Component -- only the search filter (workshop-sidebar-list.tsx) and
// the script panel's open/closed state need to be Client Components;
// everything else here renders on the server.
export function WorkshopShell({
  workshops,
  selected,
  script,
  availableScripts,
}: {
  workshops: WorkshopListItem[]
  selected: WorkshopDetail | null
  script: Script | null
  availableScripts: ScriptSummary[]
}) {
  return (
    <div className="flex min-h-screen flex-col bg-ink text-ink-foreground">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-ink-foreground/16 px-8 py-[18px]">
        <div className="flex items-center gap-4 justify-self-start">
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

        <div className="flex items-center gap-3 justify-self-center">
          {selected && (
            <>
              <ScheduleRehearsalDialog workshopId={selected.id} rehearsalAt={selected.rehearsalAt} />
              <AddMemberDialog workshopId={selected.id} />
            </>
          )}
        </div>

        <div className="justify-self-end">
          <UserMenu />
        </div>
      </div>

      <div className="flex flex-1">
        <WorkshopSidebarList workshops={workshops} selectedId={selected?.id ?? null} />

        <div className="flex flex-1 flex-col px-8 py-6">
          {selected ? (
            <>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-foreground/55">
                  Selected workshop
                </p>
                <h1 className="mt-1 text-[27px] font-semibold tracking-tight">{selected.title}</h1>
              </div>

              <div className="mt-5 flex flex-1 gap-5">
                <WorkshopDetailsPanel workshop={selected} />
                <ScriptPanel workshopId={selected.id} script={script} availableScripts={availableScripts} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-foreground/55">Workshops</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">No workshop selected</h1>
              <p className="mt-2 max-w-sm text-sm text-ink-foreground/55">
                {workshops.length === 0
                  ? 'Create a workshop from the sidebar to start building a group, scheduling a rehearsal, and attaching a script.'
                  : 'Choose a workshop from the sidebar.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
