import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import {
  AudioSession,
  LiveKitRoom,
  useLocalParticipant,
  useLocalParticipantPermissions,
  useTracks,
} from '@livekit/react-native'
import { Track } from 'livekit-client'
import { apiClient } from '../lib/api'
import { colors, radius, spacing } from '../lib/theme'
import { MediaErrorBanner } from './live-video/media-error-banner'
import { ParticipantGrid } from './live-video/participant-grid'
import { RoomControls } from './live-video/room-controls'

// Overlays the grid until this participant's server-side permission grant
// flips canPublish -- mirrors studio-web's AddMeButton
// (components/workshops/workshop-video-room.tsx) exactly: the effect below
// is what actually turns the camera/mic on once the permission change
// lands, since a grant alone doesn't start publishing.
function AddMeButton({ workshopId }: { workshopId: string }) {
  const permissions = useLocalParticipantPermissions()
  const { localParticipant } = useLocalParticipant()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!permissions?.canPublish) return
    localParticipant.setCameraEnabled(true)
    localParticipant.setMicrophoneEnabled(true)
  }, [permissions?.canPublish, localParticipant])

  if (permissions?.canPublish) return null

  return (
    <View style={styles.addMeWrap}>
      {error ? <Text style={styles.addMeError}>{error}</Text> : null}
      <Pressable
        style={styles.addMeButton}
        disabled={pending}
        onPress={async () => {
          setPending(true)
          setError(null)
          try {
            await apiClient.addMeToLiveSession(workshopId)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.')
          } finally {
            setPending(false)
          }
        }}
      >
        <Text style={styles.addMeButtonText}>{pending ? 'Joining…' : 'Add me'}</Text>
      </Pressable>
    </View>
  )
}

// A viewer who hasn't been promoted (via "Add me") never publishes
// anything, so their own entry here is always an empty placeholder --
// showing it would give them equal screen space as an actual actor's
// video for a tile of nothing. Filtered out here rather than at the
// useTracks() source, since a promoted viewer/actor should still see
// their own tile once they can publish (matches web's own self-preview
// convention for anyone actually broadcasting).
function RoomView({ workshopId, onLeave }: { workshopId: string; onLeave: () => void }) {
  const allTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }])
  const { localParticipant } = useLocalParticipant()
  const permissions = useLocalParticipantPermissions()
  const tracks = !permissions?.canPublish
    ? allTracks.filter((track) => track.participant.identity !== localParticipant.identity)
    : allTracks

  return (
    <View style={styles.container}>
      <MediaErrorBanner />
      <ParticipantGrid tracks={tracks} />
      <AddMeButton workshopId={workshopId} />
      <RoomControls onLeave={onLeave} />
    </View>
  )
}

// COR-18 (mobile): mirrors studio-web's WorkshopVideoRoom state machine
// (connecting -> error -> connected). Fetches this caller's token fresh via
// react-query rather than a raw useEffect -- matches this app's existing
// data-fetching convention everywhere else; staleTime: Infinity because a
// re-render mid-call must never silently refetch/replace the live token.
export function WorkshopVideoRoom({ workshopId, onLeave }: { workshopId: string; onLeave: () => void }) {
  const sessionQuery = useQuery({
    queryKey: ['live-token', workshopId],
    queryFn: () => apiClient.getLiveToken(workshopId),
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
        <Text style={styles.messageText}>Could not join the live session.</Text>
        <Pressable style={styles.backButton} onPress={onLeave}>
          <Text style={styles.backButtonText}>Back to workshop</Text>
        </Pressable>
      </View>
    )
  }
  if (connectionError) {
    return (
      <View style={styles.message}>
        <Text style={styles.messageText}>{connectionError}</Text>
        <Pressable style={styles.backButton} onPress={onLeave}>
          <Text style={styles.backButtonText}>Back to workshop</Text>
        </Pressable>
      </View>
    )
  }

  const { token, serverUrl, canPublish } = sessionQuery.data

  return (
    <View style={styles.container}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        audio={canPublish}
        video={canPublish}
        connect
        onDisconnected={onLeave}
        onError={(err) => setConnectionError(err.message || 'Could not join the live session.')}
      >
        <RoomView workshopId={workshopId} onLeave={onLeave} />
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
  addMeWrap: { position: 'absolute', bottom: 90, alignSelf: 'center', alignItems: 'center', gap: spacing.xs },
  addMeButton: { backgroundColor: colors.primary, borderRadius: radius, paddingHorizontal: spacing.md, paddingVertical: 12 },
  addMeButtonText: { color: colors.primaryForeground, fontWeight: '600' },
  addMeError: { color: colors.accent, fontSize: 12, textAlign: 'center' },
})
