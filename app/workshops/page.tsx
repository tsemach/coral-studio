import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { listActiveUsers, listWorkshopsForUser } from '@/lib/workshops/queries'
import { listAvailableScripts } from '@/lib/workshops/scripts'
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
  // "New workshop" dialog) renders as normal, just with an empty list and
  // no workshop selected, rather than a separate empty-state page. Still
  // need real script/user data here: the New workshop dialog lets a member
  // attach a script and add people right at creation.
  const [availableScripts, activeUsers] = await Promise.all([listAvailableScripts(), listActiveUsers()])

  return (
    <WorkshopShell workshops={list} selected={null} script={null} availableScripts={availableScripts} activeUsers={activeUsers} />
  )
}
