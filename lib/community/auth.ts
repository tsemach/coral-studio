import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/database'
import { users } from '@/lib/database/schema'

export async function requireActiveUser() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userRecords = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  const currentUser = userRecords[0]
  if (!currentUser || currentUser.status !== 'active') {
    throw new Error('Forbidden: active account required')
  }

  return currentUser
}
