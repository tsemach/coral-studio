import { AddMemberDialog } from '@/components/workshops/add-member-dialog'
import { GoLiveButton } from '@/components/workshops/go-live-button'
import { ScheduleRehearsalDialog } from '@/components/workshops/schedule-rehearsal-dialog'
import { WorkshopPanels } from '@/components/workshops/workshop-panels'
import { WorkshopSidebarList } from '@/components/workshops/workshop-sidebar-list'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import type { AddableUser, WorkshopDetail, WorkshopListItem } from '@/lib/workshops/queries'
import type { Script, ScriptSummary } from '@/lib/workshops/scripts'

export async function WorkshopMain({
  workshops,
  selected,
  script,
  availableScripts,
  activeUsers,
  addableForSelected,
}: {
  workshops: WorkshopListItem[]
  selected: WorkshopDetail | null
  script: Script | null
  availableScripts: ScriptSummary[]
  activeUsers: AddableUser[]
  addableForSelected: AddableUser[]
}) {
  const { workshops: t } = await getDictionary()

  return (
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
                <GoLiveButton workshopId={selected.id} />
                <ScheduleRehearsalDialog workshopId={selected.id} rehearsalAt={selected.rehearsalAt} location={selected.location} />
                <AddMemberDialog workshopId={selected.id} availableUsers={addableForSelected} />
              </div>
            </div>

            <WorkshopPanels workshop={selected} script={script} availableScripts={availableScripts} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-foreground/55">
              {t.main.sectionLabel}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t.main.noWorkshopSelected}</h1>
            <p className="mt-2 max-w-sm text-sm text-ink-foreground/55">
              {workshops.length === 0 ? t.main.emptyHintCreate : t.main.emptyHintChoose}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
