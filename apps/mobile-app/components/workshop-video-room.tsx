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

function ParticipantTile({ item }: { item: TrackReferenceOrPlaceholder }) {
  if (!isTrackReference(item)) return <View style={styles.tile} />
  return <VideoTrack trackRef={item} style={styles.tile} />
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

// Surfaces a camera/mic permission denial as a visible notice rather than a
// silently blank tile. lastCameraError/lastMicrophoneError are plain getters
// on LocalParticipant, not reactive on their own, so this polls -- simplest
// correct option for a v1 given how rarely this actually fires.
function MediaErrorBanner() {
  const { localParticipant } = useLocalParticipant()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      if (localParticipant.lastCameraError) setMessage('Camera could not start — check your device permissions.')
      else if (localParticipant.lastMicrophoneError) setMessage('Microphone could not start — check your device permissions.')
    }, 2000)
    return () => clearInterval(interval)
  }, [localParticipant])

  if (!message) return null
  return (
    <View style={styles.mediaErrorBanner}>
      <Text style={styles.mediaErrorText}>{message}</Text>
    </View>
  )
}

function RoomControls({ onLeave }: { onLeave: () => void }) {
  const { localParticipant } = useLocalParticipant()
  const [micOn, setMicOn] = useState(localParticipant.isMicrophoneEnabled)
  const [cameraOn, setCameraOn] = useState(localParticipant.isCameraEnabled)

  return (
    <View style={styles.controls}>
      <Pressable
        style={styles.controlButton}
        onPress={() => {
          const next = !micOn
          localParticipant.setMicrophoneEnabled(next)
          setMicOn(next)
        }}
      >
        <Text style={styles.controlButtonText}>{micOn ? 'Mute' : 'Unmute'}</Text>
      </Pressable>
      <Pressable
        style={styles.controlButton}
        onPress={() => {
          const next = !cameraOn
          localParticipant.setCameraEnabled(next)
          setCameraOn(next)
        }}
      >
        <Text style={styles.controlButtonText}>{cameraOn ? 'Stop video' : 'Start video'}</Text>
      </Pressable>
      <Pressable style={styles.leaveButton} onPress={onLeave}>
        <Text style={styles.leaveButtonText}>Leave</Text>
      </Pressable>
    </View>
  )
}

function RoomView({ workshopId, onLeave }: { workshopId: string; onLeave: () => void }) {
  const tracks = useTracks([Track.Source.Camera])
  const renderTile: ListRenderItem<TrackReferenceOrPlaceholder> = ({ item }) => <ParticipantTile item={item} />

  return (
    <View style={styles.container}>
      <MediaErrorBanner />
      <FlatList data={tracks} renderItem={renderTile} keyExtractor={(item, index) => `${item.participant.identity}-${index}`} />
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

  const { token, serverUrl, canPublish } = sessionQuery.data

  return (
    <View style={styles.container}>
      <LiveKitRoom token={token} serverUrl={serverUrl} audio={canPublish} video={canPublish} connect onDisconnected={onLeave}>
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
  tile: { height: 220, backgroundColor: colors.inkCard, margin: spacing.xs, borderRadius: radius },
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
