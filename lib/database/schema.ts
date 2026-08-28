import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const smokeTest = pgTable('smoke_test', {
  id: serial('id').primaryKey(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
