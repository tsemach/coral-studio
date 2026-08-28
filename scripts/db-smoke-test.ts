import { db } from '../lib/database'
import { smokeTest } from '../lib/database/schema'

async function main() {
  const [inserted] = await db
    .insert(smokeTest)
    .values({ message: 'coral-studio db smoke test' })
    .returning()

  const rows = await db.select().from(smokeTest)

  console.log('inserted:', inserted)
  console.log('all rows:', rows)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
