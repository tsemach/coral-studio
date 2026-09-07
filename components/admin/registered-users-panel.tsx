'use client'

import { DeleteUserButton } from '@/components/admin/delete-user-button'
import { useTranslation } from '@/components/i18n/language-provider'

type RegisteredUser = {
  id: string
  name: string | null
  email: string
  role: string
}

export function RegisteredUsersPanel({
  users,
  currentUserId,
}: {
  users: RegisteredUser[]
  currentUserId: string
}) {
  const { t } = useTranslation()

  if (users.length === 0) {
    return <p className="text-sm text-foreground/60">{t.admin.registeredUsersPanel.empty}</p>
  }

  return (
    <ul className="space-y-3">
      {users.map((user) => (
        <li
          key={user.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-5 py-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{user.name || user.email}</p>
              <p className="truncate text-sm text-foreground/60">{user.email}</p>
            </div>
            <span
              className={
                user.role === 'admin'
                  ? 'shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'
                  : 'shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground/60'
              }
            >
              {user.role === 'admin' ? t.admin.registeredUsersPanel.roleAdmin : t.admin.registeredUsersPanel.roleUser}
            </span>
          </div>

          {user.id !== currentUserId && (
            <DeleteUserButton userId={user.id} label={user.name || user.email} />
          )}
        </li>
      ))}
    </ul>
  )
}
