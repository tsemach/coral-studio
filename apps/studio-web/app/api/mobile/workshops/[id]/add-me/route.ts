import { getMobileUser } from '@/lib/mobile-auth'
import { isWorkshopMember } from '@/lib/workshops/queries'
import { promoteParticipant } from '@/lib/workshops/live'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

// Mirrors addMeToLiveSession() in app/workshops/actions.ts. Session-only:
// promoteParticipant() never touches workshop_members.type, so this
// doesn't change the caller's role in the group once the call ends.
export const POST = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const isMember = await isWorkshopMember(workshopId, user.userId)
  if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  await promoteParticipant(workshopId, user.userId)
  return new Response(null, { status: 204 })
})
