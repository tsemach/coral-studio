import { pgTable, text, timestamp, integer, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core'
import type { AdapterAccountType } from 'next-auth/adapters'

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

// COR-12. Created empty and filled in later (title/script/rehearsal date can
// all be set after creation) -- see docs/workshops/design.md.
export const workshops = pgTable('workshops', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text('title').default('Untitled workshop').notNull(),
  // Filename stem under workshops/scripts/ (see lib/workshops/scripts.ts). Null
  // until a script is attached -- script editing is out of scope for COR-12.
  scriptSlug: text('script_slug'),
  rehearsalAt: timestamp('rehearsal_at', { mode: 'date' }),
  // COR-15: null until a rehearsal has been scheduled with a location.
  location: text('location', { enum: ['studio', 'online'] }),
  // Mock for now (COR-15) -- auto-set when location is 'online', cleared for 'studio'.
  meetingUrl: text('meeting_url'),
  // Google Calendar event id backing the rehearsal, so re-scheduling PATCHes
  // the same event instead of creating duplicates, and clearing the
  // rehearsal date can DELETE it.
  googleEventId: text('google_event_id'),
  createdById: text('created_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

// The workshop creator is inserted here too (docs/workshops/workshops-spec.md
// attribute 5), so membership -- not creatorship -- is what actions gate on.
export const workshopMembers = pgTable(
  'workshop_members',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['viewer', 'actor'] }).default('actor').notNull(),
    part: text('part'), // Optional -- attribute 2c.
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    {
      membershipKey: uniqueIndex('workshop_members_workshop_user_idx').on(table.workshopId, table.userId),
    },
  ]
)
