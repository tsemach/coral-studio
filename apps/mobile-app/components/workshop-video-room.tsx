import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  useLocalParticipant,
  useLocalParticipantPermissions,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native'
import { Track } from 'livekit-client'
import { apiClient } from '../lib/api'
import { colors, radius, spacing } from '../lib/theme'

function ParticipantTile({ item, height }: { item: TrackReferenceOrPlaceholder; height: number }) {
  const name = item.participant.name || item.participant.identity
  return (
    <View style={[styles.tile, { height }]}>
      {isTrackReference(item) ? <VideoTrack trackRef={item} style={StyleSheet.absoluteFill} /> : null}
      <Text style={styles.tileName}>{name}</Text>
    </View>
  )
}

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

// Camera/mic permission denials surface here as a visible notice rather
// than a silently blank tile. useLocalParticipant() already exposes these
// reactively -- same hook RoomControls/AddMeButton use below -- no polling
// needed.
function MediaErrorBanner() {
  const { lastCameraError, lastMicrophoneError } = useLocalParticipant()
  const message = lastCameraError
    ? 'Camera could not start — check your device permissions.'
    : lastMicrophoneError
      ? 'Microphone could not start — check your device permissions.'
      : null

  if (!message) return null
  return (
    <View style={styles.mediaErrorBanner}>
      <Text style={styles.mediaErrorText}>{message}</Text>
    </View>
  )
}

function RoomControls({ onLeave }: { onLeave: () => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant()

  return (
    <View style={styles.controls}>
      <Pressable style={styles.controlButton} onPress={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}>
        <Text style={styles.controlButtonText}>{isMicrophoneEnabled ? 'Mute' : 'Unmute'}</Text>
      </Pressable>
      <Pressable style={styles.controlButton} onPress={() => localParticipant.setCameraEnabled(!isCameraEnabled)}>
        <Text style={styles.controlButtonText}>{isCameraEnabled ? 'Stop video' : 'Start video'}</Text>
      </Pressable>
      <Pressable style={styles.leaveButton} onPress={onLeave}>
        <Text style={styles.leaveButtonText}>Leave</Text>
      </Pressable>
    </View>
  )
}

// Each participant's tile takes an equal share of the grid's measured
// height -- one tile fills the whole area, two split it in half, three in
// thirds, and so on -- rather than a fixed tile height that leaves empty
// space below with few participants and requires scrolling with many.
//
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
  const [gridHeight, setGridHeight] = useState(0)
  const tileHeight = tracks.length > 0 ? gridHeight / tracks.length : gridHeight
  const renderTile: ListRenderItem<TrackReferenceOrPlaceholder> = ({ item }) => (
    <ParticipantTile item={item} height={tileHeight} />
  )

  return (
    <View style={styles.container}>
      <MediaErrorBanner />
      <View style={styles.grid} onLayout={(e) => setGridHeight(e.nativeEvent.layout.height)}>
        <FlatList
          data={tracks}
          renderItem={renderTile}
          keyExtractor={(item) => item.participant.identity}
          scrollEnabled={false}
        />
      </View>
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
  grid: { flex: 1 },
  tile: { backgroundColor: colors.inkCard, overflow: 'hidden' },
  tileName: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    color: colors.parchment,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addMeWrap: { position: 'absolute', bottom: 90, alignSelf: 'center', alignItems: 'center', gap: spacing.xs },
  addMeButton: { backgroundColor: colors.primary, borderRadius: radius, paddingHorizontal: spacing.md, paddingVertical: 12 },
  addMeButtonText: { color: colors.primaryForeground, fontWeight: '600' },
  addMeError: { color: colors.accent, fontSize: 12, textAlign: 'center' },
  mediaErrorBanner: { backgroundColor: colors.inkCard, borderBottomWidth: 1, borderColor: colors.hairline, padding: spacing.sm },
  mediaErrorText: { color: colors.accent, fontSize: 12, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderColor: colors.hairline },
  controlButton: { flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  controlButtonText: { color: colors.parchment, fontWeight: '600', fontSize: 13 },
  leaveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  leaveButtonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 13 },
})
