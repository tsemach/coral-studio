import { redirect } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { db } from '@/lib/database'
import { users } from '@/lib/database/schema'
import { approveUser, rejectUser } from './actions'

export const metadata: Metadata = {
  title: 'Pending registrations — Glumački Studio',
}

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if ((session.user as { role?: string }).role !== 'admin') redirect('/')

  const pending = await db
    .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.status, 'pending_approval'))
    .orderBy(asc(users.createdAt))

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-background px-5 py-12 text-foreground md:px-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Pending registrations</h1>
      <p className="mt-2 text-sm text-foreground/60">
        {pending.length === 0
          ? 'No registrations are waiting for approval.'
          : `${pending.length} registration${pending.length === 1 ? '' : 's'} waiting for approval.`}
      </p>

      <ul className="mt-8 space-y-3">
        {pending.map((user) => (
          <li
            key={user.id}
            className="flex items-center justify-between gap-4 rounded-sm border border-border bg-card px-5 py-4"
          >
            <div>
              <p className="font-medium">{user.name || user.email}</p>
              <p className="text-sm text-foreground/60">{user.email}</p>
            </div>

            <div className="flex shrink-0 gap-2">
              <form action={approveUser.bind(null, user.id)}>
                <button
                  type="submit"
                  className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  Approve
                </button>
              </form>
              <form action={rejectUser.bind(null, user.id)}>
                <button
                  type="submit"
                  className="rounded-sm border border-border px-4 py-2 text-sm font-semibold text-foreground/70 transition-colors hover:text-foreground"
                >
                  Reject
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
