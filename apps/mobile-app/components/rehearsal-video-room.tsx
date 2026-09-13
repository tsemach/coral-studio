import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { AudioSession, LiveKitRoom, useTracks } from '@livekit/react-native'
import { Track } from 'livekit-client'
import { apiClient } from '../lib/api'
import { colors, radius, spacing } from '../lib/theme'
import { MediaErrorBanner } from './live-video/media-error-banner'
import { ParticipantGrid } from './live-video/participant-grid'
import { RoomControls } from './live-video/room-controls'

// A rehearsal room always has exactly two participants (the post's author
// and the confirmed reader) and both always publish -- unlike Workshops'
// viewer/actor split, there's no permission gating or promotion flow here,
// so every camera track (including a placeholder for the local participant)
// renders in the grid as-is.
function RoomView({ onLeave }: { onLeave: () => void }) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }])

  return (
    <View style={styles.container}>
      <MediaErrorBanner />
      <ParticipantGrid tracks={tracks} />
      <RoomControls onLeave={onLeave} />
    </View>
  )
}

// Mirrors WorkshopVideoRoom's state machine (connecting -> error ->
// connected) and its react-query convention for fetching a fresh,
// single-use token (staleTime: Infinity -- a re-render mid-call must never
// silently refetch/replace the live token).
export function RehearsalVideoRoom({ postId, onLeave }: { postId: string; onLeave: () => void }) {
  const sessionQuery = useQuery({
    queryKey: ['rehearsal-token', postId],
    queryFn: () => apiClient.getRehearsalToken(postId),
    staleTime: Infinity,
  })
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    AudioSession.startAudioSession()
    return () => {
      AudioSession.stopAudioSession()
    }
  }, [])

  if (sessionQuery.isLoading) {
    return (
      <View style={styles.message}>
        <Text style={styles.messageText}>Connecting…</Text>
      </View>
    )
  }
  if (sessionQuery.error || !sessionQuery.data) {
    return (
      <View style={styles.message}>
        <Text style={styles.messageText}>Could not join the rehearsal.</Text>
        <Pressable style={styles.backButton} onPress={onLeave}>
          <Text style={styles.backButtonText}>Back to post</Text>
        </Pressable>
      </View>
    )
  }
  if (connectionError) {
    return (
      <View style={styles.message}>
        <Text style={styles.messageText}>{connectionError}</Text>
        <Pressable style={styles.backButton} onPress={onLeave}>
          <Text style={styles.backButtonText}>Back to post</Text>
        </Pressable>
      </View>
    )
  }

  const { token, serverUrl } = sessionQuery.data

  return (
    <View style={styles.container}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        audio
        video
        connect
        onDisconnected={onLeave}
        onError={(err) => setConnectionError(err.message || 'Could not join the rehearsal.')}
      >
        <RoomView onLeave={onLeave} />
      </LiveKitRoom>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.ink, padding: spacing.lg },
  messageText: { color: colors.parchmentMuted, fontSize: 14, textAlign: 'center' },
  backButton: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingHorizontal: spacing.md, paddingVertical: 10 },
  backButtonText: { color: colors.parchmentMuted, fontWeight: '600' },
})
