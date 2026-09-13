import { getMobileUser } from '@/lib/mobile-auth'
import { db } from '@/lib/database'
import { tapePosts } from '@/lib/database/schema'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { listTapes, getTapeById } from '@/lib/community/tape-queries'
import { toTapeItemDTO } from '@/lib/community/tape-types'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tapes = await listTapes()
  return Response.json(tapes.map(toTapeItemDTO))
})

export const POST = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const videoPathname = typeof body?.videoPathname === 'string' ? body.videoPathname : ''
  const durationSeconds = typeof body?.durationSeconds === 'number' ? body.durationSeconds : null

  if (!title || !description || !videoPathname) {
    return Response.json({ error: 'Please fill in all required fields.' }, { status: 400 })
  }

  const [createdTape] = await db
    .insert(tapePosts)
    .values({ title, description, authorId: user.userId, videoPathname, durationSeconds })
    .returning({ id: tapePosts.id })

  const tape = await getTapeById(createdTape.id)
  if (!tape) return Response.json({ error: 'Failed to load created tape.' }, { status: 500 })
  return Response.json(toTapeItemDTO(tape), { status: 201 })
})
