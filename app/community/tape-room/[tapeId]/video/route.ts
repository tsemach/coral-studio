import { NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { auth } from '@/auth'
import { getTapeVideoPathname } from '@/lib/community/tape-queries'

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

  const result = await get(pathname, { access: 'private' })
  if (!result || !result.stream) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(result.stream, {
    status: 200,
    headers: {
      'Content-Type': result.blob.contentType || 'video/mp4',
      'Content-Length': String(result.blob.size),
      'Cache-Control': 'private, no-store',
    },
  })
}
