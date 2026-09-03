import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'

// One room per workshop, named by its id. LiveKit creates the room on first
// join and tears it down once empty -- no DB row or webhook needed to track
// "is this workshop live," isWorkshopLive() below just asks LiveKit directly.
function roomNameFor(workshopId: string): string {
  return workshopId
}

function requiredEnv(name: 'LIVEKIT_URL' | 'LIVEKIT_API_KEY' | 'LIVEKIT_API_SECRET'): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set -- see .env.example`)
  return value
}

// Not secret (just the server address, like any websocket URL) -- returned
// alongside the token so the client can connect without a second,
// separately-maintained NEXT_PUBLIC_ env var.
export function getLiveKitServerUrl(): string {
  return requiredEnv('LIVEKIT_URL')
}

function roomServiceClient(): RoomServiceClient {
  // RoomServiceClient talks over plain https, so http(s):// works even
  // though the client SDK connects to the same host over wss://.
  const url = requiredEnv('LIVEKIT_URL').replace(/^wss:/, 'https:').replace(/^ws:/, 'http:')
  return new RoomServiceClient(url, requiredEnv('LIVEKIT_API_KEY'), requiredEnv('LIVEKIT_API_SECRET'))
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
