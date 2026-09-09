import { getMobileUser } from '@/lib/mobile-auth'
import { listCommunityPosts } from '@/lib/community/queries'
import { decodeCursor } from '@/lib/community/pagination'
import { toPostItemDTO } from '@/lib/community/dto'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

export async function GET(request: Request) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const channel = (searchParams.get('channel') as CommunityChannel) || undefined
  const status = (searchParams.get('status') as ReaderStatus) || undefined
  const cursor = decodeCursor(searchParams.get('cursor'))
  const rawLimit = Number(searchParams.get('limit'))
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20

  const { items, nextCursor } = await listCommunityPosts({ channel, status, cursor, limit })
  return Response.json({ items: items.map(toPostItemDTO), nextCursor })
}
