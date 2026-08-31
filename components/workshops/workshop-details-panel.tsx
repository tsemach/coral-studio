import { setRehearsalDate } from '@/app/workshops/actions'
import { WorkshopMemberRow } from '@/components/workshops/workshop-member-row'
import type { WorkshopDetail } from '@/lib/workshops/queries'

function formatRehearsalInputValue(date: Date | null) {
  if (!date) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatRehearsalDisplay(date: Date | null) {
  if (!date) return 'No rehearsal scheduled'
  return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeStyle: 'short' }).format(date)
}

export function WorkshopDetailsPanel({ workshop }: { workshop: WorkshopDetail }) {
  return (
    <div className="flex-1 rounded-2xl border border-ink-foreground/16 bg-ink-card p-6">
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
        <form
          action={setRehearsalDate.bind(null, workshop.id)}
          className="flex items-center gap-3 rounded-xl border border-ink-foreground/16 bg-ink px-4 py-3"
        >
          <input
            type="datetime-local"
            name="rehearsalAt"
            defaultValue={formatRehearsalInputValue(workshop.rehearsalAt)}
            className="flex-1 bg-transparent text-sm text-ink-foreground [color-scheme:dark] focus:outline-none"
          />
          <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            Save
          </button>
        </form>
        <p className="mt-2 text-xs text-ink-foreground/45">{formatRehearsalDisplay(workshop.rehearsalAt)}</p>
      </div>
    </div>
  )
}
