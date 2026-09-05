import { RoomServiceClient } from 'livekit-server-sdk'

export function requiredEnv(name: 'LIVEKIT_URL' | 'LIVEKIT_API_KEY' | 'LIVEKIT_API_SECRET'): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set -- see .env.example`)
  return value
}

// Not secret (just the server address, like any websocket URL) -- returned
// alongside a token so the client can connect without a second,
// separately-maintained NEXT_PUBLIC_ env var.
export function getLiveKitServerUrl(): string {
  return requiredEnv('LIVEKIT_URL')
}

export function roomServiceClient(): RoomServiceClient {
  // RoomServiceClient talks over plain https, so http(s):// works even
  // though the client SDK connects to the same host over wss://.
  const url = requiredEnv('LIVEKIT_URL').replace(/^wss:/, 'https:').replace(/^ws:/, 'http:')
  return new RoomServiceClient(url, requiredEnv('LIVEKIT_API_KEY'), requiredEnv('LIVEKIT_API_SECRET'))
}
