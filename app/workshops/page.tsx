import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { listWorkshopsForUser } from '@/lib/workshops/queries'
import { WorkshopShell } from '@/components/workshops/workshop-shell'

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

  // No workshops yet -- the shell itself (header, sidebar with its
  // "+ New workshop" button) renders as normal, just with an empty list and
  // no workshop selected, rather than a separate empty-state page. Nothing
  // in the sidebar to add a member to yet either, so skip the query.
  return <WorkshopShell workshops={list} selected={null} script={null} availableScripts={[]} activeUsers={[]} />
}
