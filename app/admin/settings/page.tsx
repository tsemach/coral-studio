import Link from 'next/link'
import { redirect } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { db } from '@/lib/database'
import { users } from '@/lib/database/schema'
import { UsersView } from '@/components/admin/users-view'
import { getDictionary } from '@/lib/i18n/get-dictionary'

export const metadata: Metadata = {
  title: 'Settings — Glumački Studio',
}

export default async function AdminSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if ((session.user as { role?: string }).role !== 'admin') redirect('/')

  const { admin: t } = await getDictionary()
  const navItems = [{ label: t.settingsPage.usersNavItem }] as const

  const [pending, registered] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.status, 'pending_approval'))
      .orderBy(asc(users.createdAt)),
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.status, 'active'))
      .orderBy(asc(users.createdAt)),
  ])

  return (
    <main className="flex min-h-screen w-full max-w-5xl flex-col bg-background px-5 py-10 text-foreground md:px-8">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          aria-label={t.settingsPage.backToSite}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-foreground/60 transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          ←
        </Link>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            {t.settingsPage.eyebrow}
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            {t.settingsPage.title}
          </h1>
        </div>
      </div>

      <div className="mt-8 border-t border-border" />

      <p className="mt-8 text-sm text-foreground/60">
        {t.settingsPage.signedInAs}{' '}
        <span className="font-medium text-foreground">{session.user.email}</span>,{' '}
        {t.settingsPage.roleLabel}{' '}
        <span className="font-medium text-foreground">{t.settingsPage.roleAdmin}</span>
      </p>

      <div className="mt-6 flex flex-1 flex-col gap-6 md:flex-row md:items-stretch">
        <nav
          aria-label={t.settingsPage.navLabel}
          className="w-full shrink-0 self-start rounded-xl border border-border bg-card p-2 md:w-56"
        >
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.label}>
                <span className="flex items-center gap-2 rounded-xl border-l-2 border-primary bg-background px-3 py-2.5 text-sm font-semibold text-foreground">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden w-px self-stretch bg-border md:block" />

        <UsersView pending={pending} registered={registered} currentUserId={session.user.id as string} />
      </div>
    </main>
  )
}
