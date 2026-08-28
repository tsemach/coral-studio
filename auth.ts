import NextAuth from 'next-auth'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'
import { db } from './lib/database'
import { users, accounts, sessions, verificationTokens } from './lib/database/schema'
import authConfig from './auth.config'
import { verifyCredentials } from './lib/verifyCredentials'
import { notifyAdminsOfPendingApproval } from './lib/emailVerification'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // role/status are always read fresh from the DB rather than trusted
    // from the JWT's cached copy -- an admin flipping someone's role/status
    // (e.g. approving them, PR-3) must take effect on their next request,
    // not just their next sign-in.
    async session(params) {
      const session = await authConfig.callbacks!.session!(params)
      if (session.user?.id) {
        const [row] = await db
          .select({ role: users.role, status: users.status })
          .from(users)
          .where(eq(users.id, session.user.id))
          .limit(1)
        if (row) {
          ;(session.user as { role?: string }).role = row.role
          ;(session.user as { status?: string }).status = row.status
        }
      }
      return session
    },
  },
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const result = await verifyCredentials(credentials.email as string, credentials.password as string)
        if ('error' in result) {
          return null
        }

        return {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          image: result.user.image,
        }
      },
    }),
  ],
  events: {
    // Fires exactly once, only when the adapter itself inserts a brand new
    // user row -- i.e. only a first-time OAuth sign-in (the Credentials
    // provider and the register API route never go through the adapter's
    // createUser). The row was just inserted with the schema's default
    // role/status (user/pending_email); move it straight to
    // pending_approval since Google/Facebook already proved the email
    // (COR-5 item 6 goes through the same admin-approval gate as item 5).
    async createUser({ user }) {
      if (!user.id || !user.email) return
      await db.update(users).set({ status: 'pending_approval', emailVerified: new Date() }).where(eq(users.id, user.id))
      await notifyAdminsOfPendingApproval(user.email)
    },
  },
})
