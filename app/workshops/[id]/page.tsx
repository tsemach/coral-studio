import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { getWorkshopDetail, listActiveUsers, listWorkshopsForUser } from '@/lib/workshops/queries'
import { getScript, listAvailableScripts } from '@/lib/workshops/scripts'
import { WorkshopShell } from '@/components/workshops/workshop-shell'

export const metadata: Metadata = {
  title: 'Workshops — Glumački Studio',
}

export default async function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const isAdmin = (session.user as { role?: string }).role === 'admin'

  const detail = await getWorkshopDetail(id)
  if (!detail) redirect('/workshops')

  const isMember = detail.members.some((member) => member.userId === session.user!.id)
  if (!isMember && !isAdmin) redirect('/workshops')

  const [list, script, availableScripts, activeUsers] = await Promise.all([
    listWorkshopsForUser(session.user.id, isAdmin),
    detail.scriptSlug ? getScript(detail.scriptSlug) : Promise.resolve(null),
    listAvailableScripts(),
    listActiveUsers(),
  ])

  return (
    <WorkshopShell
      workshops={list}
      selected={detail}
      script={script}
      availableScripts={availableScripts}
      activeUsers={activeUsers}
    />
  )
}
