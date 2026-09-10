import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { getMobileUser } from '@/lib/mobile-auth'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const POST = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const filename = typeof body?.filename === 'string' && body.filename ? body.filename : 'tape.mp4'

  // Matches the web upload flow's own pathname convention (tape-form-dialog.tsx's
  // TAPE_ROOM_PREFIX / lib/workshops/scripts.ts's SCRIPTS_PREFIX) -- "prod" only in
  // an actual Vercel Production deployment, "dev" everywhere else, so dev/preview
  // and production don't share the same Blob store's key namespace.
  const TAPE_ROOM_PREFIX = `coral-studio-blob/${process.env.VERCEL_ENV === 'production' ? 'prod' : 'dev'}/tape-room/`
  const pathname = `${TAPE_ROOM_PREFIX}${user.userId}/${Date.now()}-${filename}`

  const token = await generateClientTokenFromReadWriteToken({
    pathname,
    allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maximumSizeInBytes: 50 * 1024 * 1024, // 50MB -- capped to avoid OOM-crashing the mobile client's in-memory buffering upload path (see tapes/new.tsx's client-side size check)
    addRandomSuffix: true,
  })

  return Response.json({ token, pathname })
})
