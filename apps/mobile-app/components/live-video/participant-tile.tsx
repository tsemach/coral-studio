import { StyleSheet, Text, View } from 'react-native'
import { VideoTrack, isTrackReference, type TrackReferenceOrPlaceholder } from '@livekit/react-native'
import { liveVideoStyles } from './styles'

export function ParticipantTile({ item, height }: { item: TrackReferenceOrPlaceholder; height: number }) {
  const name = item.participant.name || item.participant.identity
  return (
    <View style={[liveVideoStyles.tile, { height }]}>
      {isTrackReference(item) ? <VideoTrack trackRef={item} style={StyleSheet.absoluteFill} /> : null}
      <Text style={liveVideoStyles.tileName}>{name}</Text>
    </View>
  )
}
