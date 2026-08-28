import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

if (!process.env.GLUMACKI_DATABASE_URL) {
  throw new Error('GLUMACKI_DATABASE_URL is not set')
}

const pool = new Pool({ connectionString: process.env.GLUMACKI_DATABASE_URL })

export const db = drizzle(pool, { schema })
