import { issueSignedToken, presignUrl } from '@vercel/blob'
import { getMobileUser } from '@/lib/mobile-auth'
import { getTapeVideoPathname } from '@/lib/community/tape-queries'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(
  async (request: Request, { params }: { params: Promise<{ tapeId: string }> }) => {
    const user = await getMobileUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { tapeId } = await params
    const pathname = await getTapeVideoPathname(tapeId)
    if (!pathname) return Response.json({ error: 'Not found' }, { status: 404 })

    const token = await issueSignedToken({
      pathname,
      operations: ['get'],
      validUntil: Date.now() + 6 * 60 * 60 * 1000, // 6 hours -- long enough for one viewing session
    })

    const { presignedUrl } = await presignUrl(token, {
      operation: 'get',
      pathname,
      access: 'private',
    })

    return Response.json({ url: presignedUrl })
  }
)
