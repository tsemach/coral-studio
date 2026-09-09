import { getMobileUser } from '@/lib/mobile-auth'
import { listTapes } from '@/lib/community/tape-queries'
import { toTapeItemDTO } from '@/lib/community/tape-types'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tapes = await listTapes()
  return Response.json(tapes.map(toTapeItemDTO))
})
