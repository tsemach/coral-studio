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

  const pathname = `community/tapes/${user.userId}/${Date.now()}-${filename}`

  const token = await generateClientTokenFromReadWriteToken({
    pathname,
    allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maximumSizeInBytes: 500 * 1024 * 1024, // 500MB -- matches the web upload route's limit
    addRandomSuffix: true,
  })

  return Response.json({ token, pathname })
})
