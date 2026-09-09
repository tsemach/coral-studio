import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api'
import { WorkshopCard } from '../../../components/workshop-card'
import { colors, spacing } from '../../../lib/theme'

export default function WorkshopsListScreen() {
  const router = useRouter()
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => apiClient.getWorkshops(),
  })

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading…</Text>
      </View>
    )
  }
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Could not load workshops.</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={data ?? []}
      keyExtractor={(item) => item.id}
      onRefresh={refetch}
      refreshing={isRefetching}
      renderItem={({ item }) => (
        <WorkshopCard workshop={item} onPress={() => router.push(`/workshops/${item.id}`)} />
      )}
      ListEmptyComponent={<Text style={styles.message}>No workshops yet.</Text>}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  content: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  message: { padding: spacing.lg, textAlign: 'center', color: colors.parchmentMuted },
})
