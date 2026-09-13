import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api'
import { WorkshopCard } from '../../../components/workshop-card'
import { colors, radius, spacing } from '../../../lib/theme'

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
    <View style={styles.container}>
      <Pressable style={styles.newButton} onPress={() => router.push('/workshops/new')}>
        <Text style={styles.newButtonText}>New workshop</Text>
      </Pressable>
      <FlatList
        style={styles.list}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  list: { flex: 1 },
  content: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  message: { padding: spacing.lg, textAlign: 'center', color: colors.parchmentMuted },
  newButton: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  newButtonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 15 },
})
