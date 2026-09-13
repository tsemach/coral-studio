import { Text, View } from 'react-native'
import { useLocalParticipant } from '@livekit/react-native'
import { liveVideoStyles } from './styles'

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
