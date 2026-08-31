import { WorkshopMemberRow } from '@/components/workshops/workshop-member-row'
import type { WorkshopDetail } from '@/lib/workshops/queries'

function formatRehearsalDisplay(date: Date | null) {
  if (!date) return 'No rehearsal scheduled'
  return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeStyle: 'short' }).format(date)
}

export function WorkshopDetailsPanel({ workshop }: { workshop: WorkshopDetail }) {
  // min-w matches script-panel.tsx's own MIN_WIDTH -- without it, flexbox
  // would let this shrink to nothing as the script panel is dragged wider
  // (its default min-width:auto has no floor of its own). overflow-y-auto
  // gives it its own internal scroll now that the row above it is
  // height-bounded (workshop-shell.tsx) -- without it, a long group list
  // would just get clipped instead of scrolling.
  return (
    <div className="min-h-0 min-w-[280px] flex-1 overflow-y-auto rounded-2xl border border-ink-foreground/16 bg-ink-card p-6">
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/55">Group</p>
        {workshop.members.length === 0 ? (
          <p className="text-sm text-ink-foreground/55">No members yet.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {workshop.members.map((member) => (
              <WorkshopMemberRow key={member.id} workshopId={workshop.id} member={member} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/55">Rehearsal</p>
        <div className="rounded-xl border border-ink-foreground/16 bg-ink px-4 py-3">
          <p className="text-sm text-ink-foreground">{formatRehearsalDisplay(workshop.rehearsalAt)}</p>
        </div>
        <p className="mt-2 text-xs text-ink-foreground/45">
          Set from &ldquo;Schedule Rehearsal&rdquo; in the top bar or the workshop&apos;s menu.
        </p>
      </div>
    </div>
  )
}
