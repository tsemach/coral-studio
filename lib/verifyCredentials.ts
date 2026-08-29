import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from './database'
import { users } from './database/schema'

// One generic error for wrong password, unverified email, and pending
// approval alike -- a distinct message per case would let an attacker (or
// an impatient signee) enumerate which emails are registered and which
// approval state they're in.
const GENERIC_ERROR = 'Invalid email or password, or your account is not active yet.'

export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ user: typeof users.$inferSelect } | { error: string }> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
    return { error: GENERIC_ERROR }
  }
  if (user.status !== 'active') {
    return { error: GENERIC_ERROR }
  }

  return { user }
}
