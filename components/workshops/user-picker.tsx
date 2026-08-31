'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { AddableUser } from '@/lib/workshops/queries'

// Reusable typeable-and-pickable user field. A native input[list]+<datalist>
// combo looked right on paper but renders as raw, unstyled browser chrome
// (just the email, no name, no app styling) -- this is a small hand-built
// combobox instead: a select-styled control that turns into a live-filtered
// list on click, closes and shows the pick on selection. Controlled by the
// parent (`selected`), which decides what picking a user means: a
// persistent single choice (add-member-dialog.tsx, via the `name` prop for
// native form submission) or a pick that's immediately consumed elsewhere
// and never fed back in (create-workshop-dialog.tsx just always passes
// `selected={null}`, so the control resets to its placeholder after every
// pick).
export function UserPicker({
  availableUsers,
  selected,
  onSelect,
  name,
  placeholder = 'Select a user…',
}: {
  availableUsers: AddableUser[]
  selected: AddableUser | null
  onSelect: (user: AddableUser) => void
  name?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isEmpty = availableUsers.length === 0

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return availableUsers
    return availableUsers.filter(
      (user) => (user.name ?? '').toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
    )
  }, [availableUsers, query])

  function openList() {
    if (isEmpty) return
    setOpen(true)
    setQuery('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function pick(user: AddableUser) {
    onSelect(user)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* The visible input is search-only, unnamed -- the hidden field
          carries the actual submitted value (the picked user's email) so
          the displayed text can be their name instead. */}
      {name && <input type="hidden" name={name} value={selected?.email ?? ''} />}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          readOnly={!open}
          value={open ? query : (selected ? (selected.name ?? selected.email) : '')}
          onChange={(e) => setQuery(e.target.value)}
          onClick={openList}
          onFocus={openList}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              setQuery('')
              inputRef.current?.blur()
            }
          }}
          disabled={isEmpty}
          placeholder={isEmpty ? 'No other active users available' : placeholder}
          className="w-full cursor-pointer rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 pr-8 text-sm text-ink-foreground placeholder:text-ink-foreground/45 focus:outline-none disabled:cursor-default disabled:opacity-45"
        />
        <svg
          className={
            open
              ? 'pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-180 text-ink-foreground/45 transition-transform'
              : 'pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-foreground/45 transition-transform'
          }
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-y-auto rounded-lg border border-ink-foreground/16 bg-ink-card py-1 shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-ink-foreground/45">No matches</p>
          ) : (
            filtered.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => pick(user)}
                className="block w-full px-3 py-1.5 text-left hover:bg-ink"
              >
                <span className="block truncate text-sm text-ink-foreground">{user.name ?? user.email}</span>
                {user.name && <span className="block truncate text-xs text-ink-foreground/50">{user.email}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
