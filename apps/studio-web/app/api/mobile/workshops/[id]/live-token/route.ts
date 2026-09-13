import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { users } from '@/lib/database/schema'
import { getMobileUser } from '@/lib/mobile-auth'
import { getMemberType, isWorkshopMember } from '@/lib/workshops/queries'
import { getLiveKitServerUrl, mintLiveToken } from '@/lib/workshops/live'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

// Mirrors getLiveToken() in app/workshops/actions.ts, reimplemented behind
// bearer auth: canPublish mirrors the caller's workshop_members.type, same
// as the web action -- actors join able to publish, viewers join
// subscribe-only until promoted via POST .../add-me.
export const GET = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const isMember = await isWorkshopMember(workshopId, user.userId)
  if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  const [row] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1)
  const displayName = row?.name || row?.email || 'Guest'

  const type = await getMemberType(workshopId, user.userId)
  const canPublish = type === 'actor'

  const token = await mintLiveToken(workshopId, user.userId, displayName, canPublish)
  return Response.json({ token, serverUrl: getLiveKitServerUrl(), canPublish })
})
