'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/database'
import { workshopMembers, workshops } from '@/lib/database/schema'
import { isWorkshopMember } from '@/lib/workshops/queries'

// Render-time gating on the page is not a security boundary -- a Server
// Action is directly POSTable, so every action re-checks the caller is a
// signed-in member of the workshop, mirroring requireAdmin() in
// app/admin/users/actions.ts. Exported so PR-3 onward's actions in this file
// can share it.
export async function requireMember(workshopId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const member = await isWorkshopMember(workshopId, session.user.id)
  if (!member) throw new Error('Unauthorized')

  return session.user as { id: string }
}

// Attribute 5: the creator is added to the group in the same call, so
// membership -- not creatorship -- is what every other action gates on.
export async function createWorkshop() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const [workshop] = await db
    .insert(workshops)
    .values({ createdById: session.user.id })
    .returning({ id: workshops.id })

  await db.insert(workshopMembers).values({
    workshopId: workshop.id,
    userId: session.user.id,
    type: 'actor',
  })

  revalidatePath('/workshops')
  redirect(`/workshops/${workshop.id}`)
}
