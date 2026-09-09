import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api'
import { ScriptViewer } from '../../../components/script-viewer'

const LIVE_POLL_INTERVAL_MS = 8000

export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const detailQuery = useQuery({
    queryKey: ['workshop', id],
    queryFn: () => apiClient.getWorkshopDetail(id),
    enabled: !!id,
  })

  const liveQuery = useQuery({
    queryKey: ['workshop-live', id],
    queryFn: () => apiClient.getWorkshopLiveStatus(id),
    enabled: !!id,
    refetchInterval: LIVE_POLL_INTERVAL_MS,
  })

  if (detailQuery.isLoading) return <Text style={styles.message}>Loading…</Text>
  if (detailQuery.error || !detailQuery.data) return <Text style={styles.message}>Could not load this workshop.</Text>

  const workshop = detailQuery.data

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{workshop.title}</Text>
      {liveQuery.data?.live ? <Text style={styles.liveBadge}>Live now</Text> : null}
      <Text style={styles.meta}>
        {workshop.rehearsalAt ? new Date(workshop.rehearsalAt).toLocaleString() : 'No rehearsal scheduled'}
        {workshop.location ? ` · ${workshop.location}` : ''}
      </Text>

      <Text style={styles.sectionTitle}>Members</Text>
      <FlatList
        data={workshop.members}
        keyExtractor={(member) => member.id}
        renderItem={({ item }) => (
          <Text style={styles.member}>
            {item.name ?? item.email} · {item.type}
            {item.part ? ` · ${item.part}` : ''}
          </Text>
        )}
        style={styles.memberList}
      />
      {workshop.scriptSlug ? <ScriptViewer slug={workshop.scriptSlug} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  message: { padding: 24, textAlign: 'center', color: '#666' },
  title: { fontSize: 20, fontWeight: '600' },
  liveBadge: { color: '#0a7d32', fontWeight: '600' },
  meta: { color: '#666' },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginTop: 12 },
  member: { paddingVertical: 4 },
  memberList: { maxHeight: 160 },
})
