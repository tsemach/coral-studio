import NextAuth from 'next-auth'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import Credentials from 'next-auth/providers/credentials'
import { and, eq } from 'drizzle-orm'
import { db } from './lib/database'
import { users, accounts, sessions, verificationTokens } from './lib/database/schema'
import authConfig from './auth.config'
import { verifyCredentials } from './lib/verifyCredentials'
import { notifyAdminsOfPendingApproval } from './lib/emailVerification'
import { hasCalendarAccess } from './lib/google/calendar'

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
    // OAuth has no `authorize()` step to gate through (that's Credentials-
    // only, see below), so this is the only checkpoint that stands between
    // "Google/Facebook proved this email" and an actual session. A brand
    // new email gets a pending_approval user row created here -- same as
    // the credentials register() route -- and is denied, mirroring how
    // registering never logs you in either (COR-5 item 6). The account is
    // linked immediately so the *next* attempt, once an admin approves,
    // resolves through the adapter's normal getUserByAccount lookup.
    async signIn({ user, account }) {
      if (!account || account.provider === 'credentials') return true
      if (!user.email) return false

      const [existing] = await db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)

      if (existing) {
        return existing.status === 'active'
      }

      const [created] = await db
        .insert(users)
        .values({
          name: user.name ?? null,
          email: user.email,
          emailVerified: new Date(),
          image: user.image ?? null,
          status: 'pending_approval',
        })
        .returning({ id: users.id })

      await db.insert(accounts).values({
        userId: created.id,
        type: account.type as 'oauth',
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token as string | undefined,
        access_token: account.access_token as string | undefined,
        expires_at: account.expires_at as number | undefined,
        token_type: account.token_type as string | undefined,
        scope: account.scope as string | undefined,
        id_token: account.id_token as string | undefined,
        session_state: account.session_state as string | undefined,
      })

      await notifyAdminsOfPendingApproval(user.email)

      return false
    },
    // COR-15: @auth/drizzle-adapter's linkAccount() (handle-login.js) only
    // ever runs the FIRST time a provider account is linked -- every repeat
    // sign-in takes the "already linked" branch and never touches the DB
    // row again, even though Google just issued a fresh access/refresh
    // token for whatever scope auth.config.ts currently requests. Without
    // this, a user who linked Google before the calendar.events scope was
    // added would keep a stale, calendar-less scope in `accounts` forever,
    // no matter how many times they sign in afterward. `account` here is
    // this sign-in's live tokenset regardless of whether it's a first link
    // or a repeat one, so re-persist it every time.
    async jwt(params) {
      const token = await authConfig.callbacks!.jwt!(params)
      if (params.account?.provider === 'google' && params.account.providerAccountId) {
        const updates: Partial<typeof accounts.$inferInsert> = {
          access_token: params.account.access_token,
          expires_at: params.account.expires_at,
          scope: params.account.scope,
        }
        if (params.account.refresh_token) updates.refresh_token = params.account.refresh_token
        await db
          .update(accounts)
          .set(updates)
          .where(and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, params.account.providerAccountId)))
      }
      return token
    },
    // role/status are always read fresh from the DB rather than trusted
    // from the JWT's cached copy -- an admin flipping someone's role/status
    // (e.g. approving them, PR-3) must take effect on their next request,
    // not just their next sign-in. hasGoogleCalendar (COR-15) rides along on
    // the same round trip -- it backs user-menu.tsx's "Connect Google
    // Calendar" item, which needs to disappear the moment a connect
    // succeeds, not just after the next sign-in.
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
        ;(session.user as { hasGoogleCalendar?: boolean }).hasGoogleCalendar = await hasCalendarAccess(session.user.id)
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
