'use client'

import { useState } from 'react'
import { PendingUsersPanel } from '@/components/admin/pending-users-panel'
import { RegisteredUsersPanel } from '@/components/admin/registered-users-panel'
import { RefreshButton } from '@/components/admin/refresh-button'
import { approveAllPending } from '@/app/admin/users/actions'
import { useTranslation } from '@/components/i18n/language-provider'

type PendingUser = {
  id: string
  name: string | null
  email: string
  createdAt: Date
}

type RegisteredUser = {
  id: string
  name: string | null
  email: string
  role: string
}

type Tab = 'pending' | 'active'

export function UsersView({
  pending,
  registered,
  currentUserId,
}: {
  pending: PendingUser[]
  registered: RegisteredUser[]
  currentUserId: string
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('active')

  return (
    <>
      <nav aria-label={t.admin.usersView.navLabel} className="w-full shrink-0 self-start space-y-3 md:w-48">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={
            tab === 'active'
              ? 'block w-full rounded-xl border-2 border-primary bg-card px-4 py-3 text-left text-sm font-semibold text-foreground'
              : 'block w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground/60 transition-colors hover:text-foreground'
          }
        >
          {t.admin.usersView.activeUsersLabel} ({registered.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={
            tab === 'pending'
              ? 'block w-full rounded-xl border-2 border-primary bg-card px-4 py-3 text-left text-sm font-semibold text-foreground'
              : 'block w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground/60 transition-colors hover:text-foreground'
          }
        >
          {t.admin.usersView.pendingUsersLabel} ({pending.length})
        </button>
      </nav>

      <div className="hidden w-px self-stretch bg-border md:block" />

      <div className="min-w-0 flex-1 self-start">
        {tab === 'pending' ? (
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                {t.admin.usersView.pendingUsersLabel} ({pending.length})
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <RefreshButton />
                <form action={approveAllPending}>
                  <button
                    type="submit"
                    disabled={pending.length === 0}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    {t.admin.usersView.approveAll}
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-6">
              <PendingUsersPanel pending={pending} />
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-border bg-card p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
              {t.admin.usersView.activeUsersLabel} ({registered.length})
            </p>

            <div className="mt-6">
              <RegisteredUsersPanel users={registered} currentUserId={currentUserId} />
            </div>
          </section>
        )}
      </div>
    </>
  )
}
