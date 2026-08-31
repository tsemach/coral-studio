'use client'

import { useId } from 'react'
import type { AddableUser } from '@/lib/workshops/queries'

// Reusable typeable-and-pickable user field: a native input+datalist combo
// (typing filters the browser's own suggestion list, clicking a suggestion
// fills it in -- no extra JS for the filtering itself). Purely controlled
// and presentational -- it doesn't know what "picking" a user should do;
// callers read `value` in their own onChange to decide (AddMemberDialog
// submits it directly as a form field, CreateWorkshopDialog watches for an
// exact email match to add the user to a running list and clear the field).
export function UserPicker({
  availableUsers,
  name,
  value,
  onChange,
  required,
  placeholder,
}: {
  availableUsers: AddableUser[]
  name?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
}) {
  const listId = useId()
  const isEmpty = availableUsers.length === 0

  return (
    <>
      <input
        type="text"
        name={name}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        required={required}
        disabled={isEmpty}
        placeholder={isEmpty ? 'No other active users available' : (placeholder ?? 'Type a name or email…')}
        className="w-full rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground placeholder:text-ink-foreground/45 focus:outline-none disabled:opacity-45"
      />
      <datalist id={listId}>
        {availableUsers.map((user) => (
          <option key={user.id} value={user.email}>
            {user.name ?? user.email}
          </option>
        ))}
      </datalist>
    </>
  )
}
