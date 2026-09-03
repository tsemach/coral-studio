import { WorkshopMain } from '@/components/workshops/workshop-main'
import { WorkshopTopbar } from '@/components/workshops/workshop-topbar'
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
      <WorkshopTopbar />

      <WorkshopMain
        workshops={workshops}
        selected={selected}
        script={script}
        availableScripts={availableScripts}
        activeUsers={activeUsers}
        addableForSelected={addableForSelected}
      />
    </div>
  )
}
