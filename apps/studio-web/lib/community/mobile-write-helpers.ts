import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { users } from '@/lib/database/schema'

export type ActiveMobileUser = { id: string; role: string; name: string | null; image: string | null }

export async function getActiveMobileUser(userId: string): Promise<ActiveMobileUser | null> {
  const [row] = await db
    .select({ id: users.id, role: users.role, name: users.name, image: users.image, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!row || row.status !== 'active') return null
  return { id: row.id, role: row.role, name: row.name, image: row.image }
}
