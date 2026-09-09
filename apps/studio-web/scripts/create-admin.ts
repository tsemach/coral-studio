// The only way to create (or promote) an admin -- there is no UI for this
// (COR-5). Usage: pnpm create-admin <email> <password> [name]
//
// Upserts on email: an existing row is promoted straight to role=admin,
// status=active, and gets its password overwritten with what's passed here
// -- this is an explicit admin action, not a place to preserve old state.
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../lib/database'
import { users } from '../lib/database/schema'

async function main() {
  const [email, password, name] = process.argv.slice(2)

  if (!email || !password) {
    console.error('Usage: pnpm create-admin <email> <password> [name]')
    process.exit(1)
  }

  const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10))
  const now = new Date()

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)

  if (existing) {
    await db
      .update(users)
      .set({ passwordHash, role: 'admin', status: 'active', emailVerified: now, name: name ?? undefined })
      .where(eq(users.id, existing.id))
    console.log(`Promoted existing user to admin: ${email}`)
  } else {
    await db.insert(users).values({
      email,
      name: name ?? null,
      passwordHash,
      role: 'admin',
      status: 'active',
      emailVerified: now,
    })
    console.log(`Created admin: ${email}`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
