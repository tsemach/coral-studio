'use client'

import { useRef, useState } from 'react'
import { removeMember, updateMember } from '@/app/workshops/actions'
import { useTranslation } from '@/components/i18n/language-provider'
import type { WorkshopMember } from '@/lib/workshops/queries'

export function WorkshopMemberRow({ workshopId, member }: { workshopId: string; member: WorkshopMember }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draftType, setDraftType] = useState<'actor' | 'viewer'>(member.type)
  // Same <dialog> + backdrop-click-to-close confirm pattern as
  // cancel-rehearsal-button.tsx -- removing someone from the group is
  // destructive enough (they lose their part/notes on this workshop) to
  // warrant a confirm step rather than firing straight off the click.
  const removeDialogRef = useRef<HTMLDialogElement>(null)

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
            {member.type === 'actor' ? t.workshops.memberRow.actor : t.workshops.memberRow.viewer}
          </span>
          <button
            type="button"
            onClick={() => {
              if (!editing) setDraftType(member.type)
              setEditing((v) => !v)
            }}
            className="text-xs font-medium text-ink-foreground/45 hover:text-ink-foreground"
          >
            {editing ? t.workshops.memberRow.close : t.workshops.memberRow.edit}
          </button>
          <button
            type="button"
            onClick={() => removeDialogRef.current?.showModal()}
            className="text-xs font-medium text-ink-foreground/45 hover:text-[#f0a8b4]"
          >
            {t.workshops.memberRow.remove}
          </button>
        </div>
      </div>

      <dialog
        ref={removeDialogRef}
        onClick={(e) => {
          if (e.target === removeDialogRef.current) removeDialogRef.current?.close()
        }}
        className="m-auto max-w-sm border-0 bg-transparent p-0 backdrop:bg-black/50"
      >
        <div className="w-full max-w-sm rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground">
          <p className="text-lg font-semibold">{t.workshops.memberRow.confirmTitle}</p>
          <p className="mt-1 text-sm text-ink-foreground/60">
            {t.workshops.memberRow.confirmBodyPrefix}
            <span className="font-medium text-ink-foreground">{member.name || member.email}</span>
            {t.workshops.memberRow.confirmBodySuffix}
          </p>

          <form action={removeMember.bind(null, workshopId, member.id)} className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => removeDialogRef.current?.close()}
              className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground"
            >
              {t.workshops.memberRow.keepThem}
            </button>
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              {t.workshops.memberRow.remove}
            </button>
          </form>
        </div>
      </dialog>

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
            <option value="actor">{t.workshops.memberRow.actor}</option>
            <option value="viewer">{t.workshops.memberRow.viewer}</option>
          </select>
          <input
            name="part"
            defaultValue={member.part ?? ''}
            placeholder={t.workshops.memberRow.partPlaceholder}
            disabled={draftType === 'viewer'}
            className="min-w-0 flex-1 rounded-lg border border-ink-foreground/16 bg-ink-card px-2 py-1.5 text-xs text-ink-foreground placeholder:text-ink-foreground/40 disabled:opacity-40"
          />
          <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            {t.workshops.memberRow.save}
          </button>
        </form>
      )}
    </div>
  )
}
