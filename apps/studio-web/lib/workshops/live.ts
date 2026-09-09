import { AccessToken } from 'livekit-server-sdk'
import { requiredEnv, roomServiceClient } from '@/lib/livekit'

export { getLiveKitServerUrl } from '@/lib/livekit'

// One room per workshop, named by its id. LiveKit creates the room on first
// join and tears it down once empty -- no DB row or webhook needed to track
// "is this workshop live," isWorkshopLive() below just asks LiveKit directly.
function roomNameFor(workshopId: string): string {
  return workshopId
}

// Mints a per-user room token. canPublish gates whether this participant can
// turn on camera/mic (attribute: only "Actor" type members are visible in
// the video by default) -- viewers still connect and canSubscribe, they just
// join silent/invisible until promoted via promoteParticipant() below.
export async function mintLiveToken(
  workshopId: string,
  userId: string,
  name: string,
  canPublish: boolean
): Promise<string> {
  const token = new AccessToken(requiredEnv('LIVEKIT_API_KEY'), requiredEnv('LIVEKIT_API_SECRET'), {
    identity: userId,
    name,
  })
  token.addGrant({
    room: roomNameFor(workshopId),
    roomJoin: true,
    canPublish,
    canSubscribe: true,
    canPublishData: false,
  })
  return token.toJwt()
}

// Whether anyone is currently connected to this workshop's room -- backs the
// "Live now" indicator for members who haven't pressed Go Live themselves.
export async function isWorkshopLive(workshopId: string): Promise<boolean> {
  const rooms = await roomServiceClient().listRooms([roomNameFor(workshopId)])
  return rooms.some((room) => room.numParticipants > 0)
}

// "Add me": flips an already-connected viewer's permission to publish,
// without disconnecting them -- LiveKit notifies their client via a
// ParticipantPermissionChanged event, which is what actually turns their
// camera/mic on client-side (workshop-video-room.tsx). Session-only: this
// never touches workshop_members.type, so it doesn't change their role in
// the group once the call ends.
export async function promoteParticipant(workshopId: string, userId: string): Promise<void> {
  await roomServiceClient().updateParticipant(roomNameFor(workshopId), userId, {
    permission: { canPublish: true, canSubscribe: true, canPublishData: false },
  })
}
