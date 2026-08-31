'use client'

import { useState } from 'react'
import { removeMember, updateMember } from '@/app/workshops/actions'
import type { WorkshopMember } from '@/lib/workshops/queries'

export function WorkshopMemberRow({ workshopId, member }: { workshopId: string; member: WorkshopMember }) {
  const [editing, setEditing] = useState(false)
  const [draftType, setDraftType] = useState<'actor' | 'viewer'>(member.type)

  return (
    <div className="rounded-xl border border-ink-foreground/16 bg-ink px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#3a2f27] text-[13px] font-semibold">
            {(member.name || member.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{member.name || member.email}</p>
            <p className="truncate text-xs text-ink-foreground/55">{member.part || member.email}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span
            className={
              member.type === 'actor'
                ? 'rounded-full bg-primary/25 px-2.5 py-0.5 text-xs font-medium text-[#f0a8b4]'
                : 'rounded-full border border-ink-foreground/16 px-2.5 py-0.5 text-xs font-medium text-ink-foreground/55'
            }
          >
            {member.type === 'actor' ? 'Actor' : 'Viewer'}
          </span>
          <button
            type="button"
            onClick={() => {
              if (!editing) setDraftType(member.type)
              setEditing((v) => !v)
            }}
            className="text-xs font-medium text-ink-foreground/45 hover:text-ink-foreground"
          >
            {editing ? 'Close' : 'Edit'}
          </button>
          <form action={removeMember.bind(null, workshopId, member.id)}>
            <button type="submit" className="text-xs font-medium text-ink-foreground/45 hover:text-[#f0a8b4]">
              Remove
            </button>
          </form>
        </div>
      </div>

      {editing && (
        <form
          action={async (formData) => {
            await updateMember(workshopId, member.id, formData)
            setEditing(false)
          }}
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-foreground/10 pt-3"
        >
          <select
            name="type"
            value={draftType}
            onChange={(e) => setDraftType(e.target.value as 'actor' | 'viewer')}
            className="rounded-lg border border-ink-foreground/16 bg-ink-card px-2 py-1.5 text-xs text-ink-foreground"
          >
            <option value="actor">Actor</option>
            <option value="viewer">Viewer</option>
          </select>
          <input
            name="part"
            defaultValue={member.part ?? ''}
            placeholder="Part (optional)"
            disabled={draftType === 'viewer'}
            className="min-w-0 flex-1 rounded-lg border border-ink-foreground/16 bg-ink-card px-2 py-1.5 text-xs text-ink-foreground placeholder:text-ink-foreground/40 disabled:opacity-40"
          />
          <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            Save
          </button>
        </form>
      )}
    </div>
  )
}
