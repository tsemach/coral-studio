import Link from 'next/link'
import { UserMenu } from '@/components/user-menu'
import { AddMemberDialog } from '@/components/workshops/add-member-dialog'
import { ScheduleRehearsalDialog } from '@/components/workshops/schedule-rehearsal-dialog'
import { WorkshopPanels } from '@/components/workshops/workshop-panels'
import { WorkshopSidebarList } from '@/components/workshops/workshop-sidebar-list'
import type { AddableUser, WorkshopDetail, WorkshopListItem } from '@/lib/workshops/queries'
import type { Script, ScriptSummary } from '@/lib/workshops/scripts'

// Server Component -- only the search filter (workshop-sidebar-list.tsx) and
// the script panel's open/closed state need to be Client Components;
// everything else here renders on the server.
export function WorkshopShell({
  workshops,
  selected,
  script,
  availableScripts,
  activeUsers,
}: {
  workshops: WorkshopListItem[]
  selected: WorkshopDetail | null
  script: Script | null
  availableScripts: ScriptSummary[]
  activeUsers: AddableUser[]
}) {
  // Exclude the selected workshop's current members from its own picker --
  // cheap since selected.members is already loaded. Every other card in the
  // sidebar does the same thing with its own memberUserIds, in
  // workshop-card-menu.tsx.
  const addableForSelected = selected
    ? activeUsers.filter((user) => !selected.members.some((member) => member.userId === user.id))
    : []
  return (
    // h-screen + overflow-hidden (not min-h-screen) is load-bearing: without
    // an actual height ceiling here, flex-1 below never becomes a bounded
    // box -- the page just grows to fit content instead, and overflow-y-auto
    // further down has nothing to overflow against. min-h-0 has to ride
    // along at every flex-1 level in the chain too (a flex item's default
    // min-height:auto refuses to shrink below its content size, which
    // silently defeats overflow at whichever level omits it).
    <div className="flex h-screen flex-col overflow-hidden bg-ink text-ink-foreground">
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

      <div className="flex min-h-0 flex-1">
        <WorkshopSidebarList
          workshops={workshops}
          selectedId={selected?.id ?? null}
          activeUsers={activeUsers}
          availableScripts={availableScripts}
        />

        <div className="flex min-h-0 flex-1 flex-col px-8 py-6">
          {selected ? (
            <>
              <div className="flex shrink-0 items-center justify-between gap-4">
                <h1 className="text-[27px] font-semibold tracking-tight">{selected.title}</h1>
                <div className="flex items-center gap-3">
                  <ScheduleRehearsalDialog workshopId={selected.id} rehearsalAt={selected.rehearsalAt} />
                  <AddMemberDialog workshopId={selected.id} availableUsers={addableForSelected} />
                </div>
              </div>

              <WorkshopPanels workshop={selected} script={script} availableScripts={availableScripts} />
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
