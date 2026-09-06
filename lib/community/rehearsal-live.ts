import { AccessToken } from 'livekit-server-sdk'
import { requiredEnv } from '@/lib/livekit'

export { getLiveKitServerUrl } from '@/lib/livekit'

// Unlike Workshops' mintLiveToken (group rooms, publish gated by "Actor"
// type + a promotion flow), a rehearsal room always has exactly two
// participants and both are always visible/audible -- there's no
// silent-viewer concept in a 1-on-1 call.
export async function mintRehearsalToken(postId: string, userId: string, name: string): Promise<string> {
  const token = new AccessToken(requiredEnv('LIVEKIT_API_KEY'), requiredEnv('LIVEKIT_API_SECRET'), {
    identity: userId,
    name,
  })
  token.addGrant({
    room: postId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
  })
  return token.toJwt()
}
