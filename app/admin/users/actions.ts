'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/database'
import { users } from '@/lib/database/schema'
import { getEmailProvider } from '@/lib/email'

// Render-time gating on the page is not a security boundary -- a Server
// Action is directly POSTable, so every action re-checks the caller is a
// signed-in, currently-active admin using the same live DB-backed session
// as the page (see auth.ts's session callback).
async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || (session.user as { role?: string }).role !== 'admin') {
    throw new Error('Unauthorized')
  }
  return session.user as { id: string; role: string }
}

async function currentOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function approveUser(userId: string) {
  const admin = await requireAdmin()

  const [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
  if (!target) throw new Error('User not found')

  await db
    .update(users)
    .set({ status: 'active', approvedAt: new Date(), approvedById: admin.id })
    .where(eq(users.id, userId))

  const origin = await currentOrigin()
  await getEmailProvider().sendApprovedEmail(target.email, `${origin}/login`)

  revalidatePath('/admin/users')
}

export async function rejectUser(userId: string) {
  const admin = await requireAdmin()

  await db
    .update(users)
    .set({ status: 'rejected', approvedAt: new Date(), approvedById: admin.id })
    .where(eq(users.id, userId))

  revalidatePath('/admin/users')
}
