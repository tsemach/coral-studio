import { randomBytes } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { db } from './database'
import { users, verificationTokens } from './database/schema'
import { getEmailProvider } from './email'

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export async function createEmailVerification(email: string, origin: string): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + VERIFICATION_TTL_MS)

  await db.insert(verificationTokens).values({ identifier: email, token, expires })

  const verifyUrl = `${origin}/verify-email?${new URLSearchParams({ token, email })}`
  await getEmailProvider().sendVerificationEmail(email, verifyUrl)
}

// Single-use: the matching row is deleted whether or not it was expired, so
// a stale/guessed token can't be retried. Confirming the email moves the
// user from pending_email to pending_approval -- it does not finish
// registration (COR-5 item 5: an admin still has to approve, PR-3).
export async function consumeEmailVerification(
  email: string,
  token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.identifier, email), eq(verificationTokens.token, token)))
    .limit(1)

  if (!row) {
    return { ok: false, error: 'This verification link is invalid or has already been used.' }
  }

  await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.identifier, email), eq(verificationTokens.token, token)))

  if (row.expires.getTime() < Date.now()) {
    return { ok: false, error: 'This verification link has expired. Please register again.' }
  }

  await db
    .update(users)
    .set({ emailVerified: new Date(), status: 'pending_approval' })
    .where(and(eq(users.email, email), eq(users.status, 'pending_email')))

  await notifyAdminsOfPendingApproval(email)

  return { ok: true }
}

async function notifyAdminsOfPendingApproval(registrantEmail: string): Promise<void> {
  const admins = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.role, 'admin'), eq(users.status, 'active')))

  const emailProvider = getEmailProvider()
  await Promise.all(admins.map((admin) => emailProvider.sendPendingApprovalNotification(admin.email, registrantEmail)))
}
