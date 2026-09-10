import { put } from '@vercel/blob'
import { getMobileUser } from '@/lib/mobile-auth'
import { db } from '@/lib/database'
import { communityPosts, communityAttachments } from '@/lib/database/schema'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { getCommunityPostById, listCommunityPosts } from '@/lib/community/queries'
import { decodeCursor, encodeCursor } from '@/lib/community/pagination'
import { toPostItemDTO, toPostDetailDTO } from '@/lib/community/dto'
import type { CommunityChannel, ReaderStatus, RehearsalFormat, CastingType } from '@/lib/community/types'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const channel = (searchParams.get('channel') as CommunityChannel) || undefined
  const status = (searchParams.get('status') as ReaderStatus) || undefined
  const cursor = decodeCursor(searchParams.get('cursor'))
  const rawLimit = Number(searchParams.get('limit'))
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20

  const { items, nextCursor } = await listCommunityPosts({ channel, status, cursor, limit })
  return Response.json({ items: items.map(toPostItemDTO), nextCursor: nextCursor ? encodeCursor(nextCursor) : null })
})

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB, matches the web action's limit
const ALLOWED_ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function isAllowedMobileAttachment(file: File): boolean {
  return ALLOWED_ATTACHMENT_TYPES.has(file.type) && file.size > 0 && file.size <= MAX_ATTACHMENT_BYTES
}

export const POST = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData().catch(() => null)
  if (!formData) return Response.json({ error: 'Invalid request body.' }, { status: 400 })

  const channel = formData.get('channel') as CommunityChannel
  const title = (formData.get('title') as string)?.trim()
  const content = (formData.get('content') as string)?.trim()

  if (!channel || !title || !content) {
    return Response.json({ error: 'Please fill in all required fields.' }, { status: 400 })
  }

  const validChannels: CommunityChannel[] = ['reader_sos', 'callboard', 'craft_chat', 'general']
  if (!validChannels.includes(channel)) {
    return Response.json({ error: 'Unknown channel.' }, { status: 400 })
  }

  let rehearsalAt: Date | null = null
  let rehearsalFormat: RehearsalFormat | null = null
  let sceneDetails: string | null = null

  if (channel === 'reader_sos') {
    const rawRehearsalAt = formData.get('rehearsalAt') as string
    if (rawRehearsalAt) {
      const parsed = new Date(rawRehearsalAt)
      if (!isNaN(parsed.getTime())) rehearsalAt = parsed
    }
    const rawFormat = formData.get('rehearsalFormat') as RehearsalFormat
    if (rawFormat === 'studio' || rawFormat === 'online') rehearsalFormat = rawFormat
    const rawSceneDetails = (formData.get('sceneDetails') as string)?.trim()
    if (rawSceneDetails) sceneDetails = rawSceneDetails
  }

  let castingType: CastingType | null = null
  let deadlineAt: Date | null = null

  if (channel === 'callboard') {
    const rawCastingType = formData.get('castingType') as CastingType
    const validCastingTypes: CastingType[] = ['student_film', 'theatre', 'feature', 'commercial', 'crew_rec']
    if (validCastingTypes.includes(rawCastingType)) castingType = rawCastingType
    const rawDeadlineAt = formData.get('deadlineAt') as string
    if (rawDeadlineAt) {
      const parsed = new Date(rawDeadlineAt)
      if (!isNaN(parsed.getTime())) deadlineAt = parsed
    }
  }

  const [createdPost] = await db
    .insert(communityPosts)
    .values({
      channel,
      title,
      content,
      authorId: user.userId,
      readerStatus: channel === 'reader_sos' ? 'seeking' : null,
      rehearsalAt,
      rehearsalFormat,
      sceneDetails,
      castingType,
      deadlineAt,
      isPinned: false,
    })
    .returning()

  const files = formData.getAll('attachments')
  for (const item of files) {
    if (!(item instanceof File) || item.size === 0) continue
    if (!isAllowedMobileAttachment(item)) {
      console.error(`Rejected mobile community attachment "${item.name}": type=${item.type} size=${item.size}`)
      continue
    }
    try {
      const pathname = `community/${createdPost.id}/${Date.now()}-${item.name}`
      const blob = await put(pathname, item, { access: 'public' })
      await db.insert(communityAttachments).values({
        postId: createdPost.id,
        url: blob.url,
        filename: item.name,
        fileType: item.type || 'application/octet-stream',
        fileSize: item.size,
      })
    } catch (err) {
      console.error('Failed to upload mobile community attachment to Vercel Blob:', err)
    }
  }

  const detail = await getCommunityPostById(createdPost.id)
  if (!detail) return Response.json({ error: 'Failed to load created post.' }, { status: 500 })
  return Response.json(toPostDetailDTO(detail), { status: 201 })
})
