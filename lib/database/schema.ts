import { pgTable, serial, text, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core'
import type { AdapterAccountType } from 'next-auth/adapters'

export const smokeTest = pgTable('smoke_test', {
  id: serial('id').primaryKey(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Login is only permitted once status === 'active'. A credentials sign-up
// starts at pending_email; verifying the address moves it to
// pending_approval (COR-5 requires admin approval even after email verify).
// An OAuth sign-in skips straight to pending_approval since the provider
// already proved the email. A CLI-created admin (scripts/create-admin.ts)
// is inserted directly as active -- there is no UI path to that state.
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  passwordHash: text('password_hash'), // Nullable for OAuth-only accounts
  role: text('role', { enum: ['user', 'admin'] }).default('user').notNull(),
  status: text('status', {
    enum: ['pending_email', 'pending_approval', 'active', 'rejected'],
  })
    .default('pending_email')
    .notNull(),
  approvedAt: timestamp('approved_at', { mode: 'date' }),
  approvedById: text('approved_by_id'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

// @auth/drizzle-adapter's required shape for OAuth account linking.
export const accounts = pgTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    {
      parentKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ]
)

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

// Reused for both NextAuth's OAuth email-linking flow and this project's own
// registration email-confirmation tokens (lib/emailVerification.ts, PR-2).
export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => [
    {
      parentKey: primaryKey({ columns: [vt.identifier, vt.token] }),
    },
  ]
)
