import NextAuth from 'next-auth'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'
import { db } from './lib/database'
import { users, accounts, sessions, verificationTokens } from './lib/database/schema'
import authConfig from './auth.config'
import { verifyCredentials } from './lib/verifyCredentials'

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
})
