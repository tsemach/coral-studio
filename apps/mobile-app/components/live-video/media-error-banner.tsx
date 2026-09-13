import { Text, View } from 'react-native'
import { useLocalParticipant } from '@livekit/react-native'
import { liveVideoStyles } from './styles'

// Camera/mic permission denials surface here as a visible notice rather
// than a silently blank tile. useLocalParticipant() already exposes these
// reactively -- same hook RoomControls/AddMeButton use below -- no polling
// needed.
export function MediaErrorBanner() {
  const { lastCameraError, lastMicrophoneError } = useLocalParticipant()
  const message = lastCameraError
    ? 'Camera could not start — check your device permissions.'
    : lastMicrophoneError
      ? 'Microphone could not start — check your device permissions.'
      : null

  if (!message) return null
  return (
    <View style={liveVideoStyles.mediaErrorBanner}>
      <Text style={liveVideoStyles.mediaErrorText}>{message}</Text>
    </View>
  )
}
