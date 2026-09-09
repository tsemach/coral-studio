import { auth } from '@/auth'
import { isWorkshopMember } from '@/lib/workshops/queries'
import { isWorkshopLive } from '@/lib/workshops/live'

// Polled by go-live-button.tsx (~every 8s) to show "Live now" to members who
// haven't joined yet -- a route handler rather than a Server Action since
// it's driven by setInterval + fetch, not a form/button submit.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const member = await isWorkshopMember(workshopId, session.user.id)
  if (!member) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const live = await isWorkshopLive(workshopId)
  return Response.json({ live })
}
