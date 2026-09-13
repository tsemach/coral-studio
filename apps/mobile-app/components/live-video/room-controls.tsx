import { Pressable, Text, View } from 'react-native'
import { useLocalParticipant } from '@livekit/react-native'
import { liveVideoStyles } from './styles'

export function RoomControls({ onLeave }: { onLeave: () => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant()

  return (
    <View style={liveVideoStyles.controls}>
      <Pressable style={liveVideoStyles.controlButton} onPress={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}>
        <Text style={liveVideoStyles.controlButtonText}>{isMicrophoneEnabled ? 'Mute' : 'Unmute'}</Text>
      </Pressable>
      <Pressable style={liveVideoStyles.controlButton} onPress={() => localParticipant.setCameraEnabled(!isCameraEnabled)}>
        <Text style={liveVideoStyles.controlButtonText}>{isCameraEnabled ? 'Stop video' : 'Start video'}</Text>
      </Pressable>
      <Pressable style={liveVideoStyles.leaveButton} onPress={onLeave}>
        <Text style={liveVideoStyles.leaveButtonText}>Leave</Text>
      </Pressable>
    </View>
  )
}
