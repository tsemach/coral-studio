import { useState } from 'react'
import { FlatList, View, type ListRenderItem } from 'react-native'
import type { TrackReferenceOrPlaceholder } from '@livekit/react-native'
import { ParticipantTile } from './participant-tile'
import { liveVideoStyles } from './styles'

// Each participant's tile takes an equal share of the grid's measured
// height -- one tile fills the whole area, two split it in half, three in
// thirds, and so on -- rather than a fixed tile height that leaves empty
// space below with few participants and requires scrolling with many.
export function ParticipantGrid({ tracks }: { tracks: TrackReferenceOrPlaceholder[] }) {
  const [gridHeight, setGridHeight] = useState(0)
  const tileHeight = tracks.length > 0 ? gridHeight / tracks.length : gridHeight
  const renderTile: ListRenderItem<TrackReferenceOrPlaceholder> = ({ item }) => (
    <ParticipantTile item={item} height={tileHeight} />
  )

  return (
    <View style={liveVideoStyles.grid} onLayout={(e) => setGridHeight(e.nativeEvent.layout.height)}>
      <FlatList
        data={tracks}
        renderItem={renderTile}
        keyExtractor={(item) => item.participant.identity}
        scrollEnabled={false}
      />
    </View>
  )
}
