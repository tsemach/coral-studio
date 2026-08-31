'use client'

import { useEffect, useRef, useState } from 'react'
import { deleteWorkshop, leaveWorkshop } from '@/app/workshops/actions'
import { AddMemberDialog, type DialogHandle } from '@/components/workshops/add-member-dialog'
import { ScheduleRehearsalDialog } from '@/components/workshops/schedule-rehearsal-dialog'

const menuItemClass = 'block w-full px-4 py-2 text-left text-[13.5px] text-ink-foreground/80 hover:bg-ink'

export function WorkshopCardMenu({
  workshopId,
  title,
  memberCount,
  rehearsalAt,
}: {
  workshopId: string
  title: string
  memberCount: number
  rehearsalAt: Date | null
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const deleteDialogRef = useRef<HTMLDialogElement>(null)
  const addMemberRef = useRef<DialogHandle>(null)
  const scheduleRef = useRef<DialogHandle>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="Workshop options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-ink-foreground/55 hover:bg-ink hover:text-ink-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.8"></circle>
          <circle cx="12" cy="12" r="1.8"></circle>
          <circle cx="12" cy="19" r="1.8"></circle>
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-[calc(100%+6px)] z-10 w-[190px] rounded-lg border border-ink-foreground/16 bg-ink-card py-1 shadow-lg"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              addMemberRef.current?.open()
            }}
            className={menuItemClass}
          >
            + Add user
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              scheduleRef.current?.open()
            }}
            className={menuItemClass}
          >
            Schedule Rehearsal
          </button>

          {memberCount > 1 ? (
            <form action={leaveWorkshop.bind(null, workshopId)}>
              <button type="submit" className={menuItemClass}>
                Leave workshop
              </button>
            </form>
          ) : (
            <>
              <div className="my-1 h-px bg-ink-foreground/16" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  deleteDialogRef.current?.showModal()
                }}
                className="block w-full px-4 py-2 text-left text-[13.5px] font-medium text-[#f0a8b4] hover:bg-ink"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Always mounted, independent of the dropdown above -- a <dialog>
          opened via showModal() force-closes the instant it (or an
          ancestor) stops being rendered, which the dropdown does the
          moment a menu item click also closes it. */}
      <AddMemberDialog ref={addMemberRef} workshopId={workshopId} hideTrigger />
      <ScheduleRehearsalDialog ref={scheduleRef} workshopId={workshopId} rehearsalAt={rehearsalAt} hideTrigger />

      <dialog
        ref={deleteDialogRef}
        onClick={(e) => {
          if (e.target === deleteDialogRef.current) deleteDialogRef.current?.close()
        }}
        className="w-full max-w-sm rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground backdrop:bg-black/50"
      >
        <p className="text-lg font-semibold">Delete workshop?</p>
        <p className="mt-2 text-sm text-ink-foreground/60">
          Delete <span className="font-medium text-ink-foreground">{title}</span>? This permanently removes it and
          cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => deleteDialogRef.current?.close()}
            className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground"
          >
            Cancel
          </button>
          <form action={deleteWorkshop.bind(null, workshopId)}>
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Delete
            </button>
          </form>
        </div>
      </dialog>
    </div>
  )
}
