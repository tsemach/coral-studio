import { defineConfig } from 'drizzle-kit'

if (!process.env.GLUMACKI_DATABASE_URL) {
  throw new Error('GLUMACKI_DATABASE_URL is not set')
}

export default defineConfig({
  schema: './lib/database/schema.ts',
  out: './lib/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.GLUMACKI_DATABASE_URL,
  },
})
