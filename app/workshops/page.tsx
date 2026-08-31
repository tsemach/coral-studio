import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { listWorkshopsForUser } from '@/lib/workshops/queries'
import { createWorkshop } from '@/app/workshops/actions'

export const metadata: Metadata = {
  title: 'Workshops — Glumački Studio',
}

export default async function WorkshopsIndexPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const isAdmin = (session.user as { role?: string }).role === 'admin'
  const list = await listWorkshopsForUser(session.user.id, isAdmin)

  if (list.length > 0) {
    redirect(`/workshops/${list[0].id}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-5 text-center text-ink-foreground">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-foreground/55">Workshops</p>
      <h1 className="text-3xl font-semibold tracking-tight">No workshops yet</h1>
      <p className="max-w-sm text-sm text-ink-foreground/60">
        Create a workshop to start building a group, scheduling a rehearsal, and attaching a script.
      </p>
      <form action={createWorkshop}>
        <button
          type="submit"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          + New workshop
        </button>
      </form>
    </main>
  )
}
