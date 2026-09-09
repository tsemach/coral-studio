import { FlatList, StyleSheet, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api'
import { WorkshopCard } from '../../../components/workshop-card'

export default function WorkshopsListScreen() {
  const router = useRouter()
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => apiClient.getWorkshops(),
  })

  if (isLoading) return <Text style={styles.message}>Loading…</Text>
  if (error) return <Text style={styles.message}>Could not load workshops.</Text>

  return (
    <FlatList
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
  message: { padding: 24, textAlign: 'center', color: '#666' },
})
