'use client'

import { deleteUser } from '@/app/admin/users/actions'

export function DeleteUserButton({ userId, label }: { userId: string; label: string }) {
  return (
    <form
      action={deleteUser.bind(null, userId)}
      onSubmit={(e) => {
        if (!confirm(`Delete ${label}? This permanently removes their account and cannot be undone.`)) {
          e.preventDefault()
        }
      }}
    >
      <button
        type="submit"
        className="shrink-0 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
      >
        Delete
      </button>
    </form>
  )
}
