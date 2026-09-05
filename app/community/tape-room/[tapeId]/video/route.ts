import { NextResponse } from 'next/server'
import { issueSignedToken, presignUrl } from '@vercel/blob'
import { auth } from '@/auth'
import { getTapeVideoPathname } from '@/lib/community/tape-queries'

// Redirects to a short-lived signed URL on Vercel Blob's own CDN rather than
// proxying bytes through this function. That CDN natively supports byte-range
// requests, which a hand-rolled proxy here would not (this project's @vercel/blob
// version doesn't type a 206 response from get()) -- without real Range support,
// browsers can silently refuse to seek a playing video at all rather than just
// seeking slower, since scrubbing depends on being able to fetch a specific byte
// range instead of redownloading from the start.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tapeId: string }> }
): Promise<Response> {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 })
  }

  const { tapeId } = await params
  const pathname = await getTapeVideoPathname(tapeId)
  if (!pathname) {
    return new NextResponse(null, { status: 404 })
  }

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

  return NextResponse.redirect(presignedUrl)
}
