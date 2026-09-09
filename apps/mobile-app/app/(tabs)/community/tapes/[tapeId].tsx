import { StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useVideoPlayer, VideoView } from 'expo-video'
import { apiClient } from '../../../../lib/api'
import { colors } from '../../../../lib/theme'

export default function TapeDetailScreen() {
  const { tapeId } = useLocalSearchParams<{ tapeId: string }>()

  const videoUrlQuery = useQuery({
    queryKey: ['tape-video-url', tapeId],
    queryFn: () => apiClient.getTapeVideoUrl(tapeId),
    enabled: !!tapeId,
  })

  const player = useVideoPlayer(videoUrlQuery.data?.url ?? null, (p) => {
    p.loop = false
  })

  if (videoUrlQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading…</Text>
      </View>
    )
  }
  if (videoUrlQuery.error || !videoUrlQuery.data) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Could not load this tape.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <VideoView style={styles.video} player={player} nativeControls />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  message: { padding: 24, textAlign: 'center', color: colors.parchmentMuted },
  video: { width: '100%', height: 240, backgroundColor: '#000' },
})
