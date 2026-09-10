import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api'
import { ScriptViewer } from '../../../components/script-viewer'
import { AddMemberSheet } from '../../../components/add-member-sheet'
import { colors, spacing } from '../../../lib/theme'

const LIVE_POLL_INTERVAL_MS = 8000

export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [addMemberVisible, setAddMemberVisible] = useState(false)

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

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => apiClient.removeWorkshopMember(id, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workshop', id] }),
  })

  if (detailQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading…</Text>
      </View>
    )
  }
  if (detailQuery.error || !detailQuery.data) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Could not load this workshop.</Text>
      </View>
    )
  }

  const workshop = detailQuery.data

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{workshop.title}</Text>
        {liveQuery.data?.live ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live now</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.meta}>
        {workshop.rehearsalAt ? new Date(workshop.rehearsalAt).toLocaleString() : 'No rehearsal scheduled'}
        {workshop.location ? ` · ${workshop.location}` : ''}
      </Text>

      <Text style={styles.sectionTitle}>Members</Text>
      <FlatList
        data={workshop.members}
        keyExtractor={(member) => member.id}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <Text style={styles.member}>
              <Text style={styles.memberName}>{item.name ?? item.email}</Text>
              <Text style={styles.memberMeta}>
                {'  '}· {item.type}
                {item.part ? ` · ${item.part}` : ''}
              </Text>
            </Text>
            <Pressable onPress={() => removeMemberMutation.mutate(item.id)}>
              <Text style={styles.removeLink}>Remove</Text>
            </Pressable>
          </View>
        )}
        style={styles.memberList}
      />
      <Pressable style={styles.addMemberButton} onPress={() => setAddMemberVisible(true)}>
        <Text style={styles.addMemberButtonText}>Add member</Text>
      </Pressable>
      <AddMemberSheet
        workshopId={id}
        visible={addMemberVisible}
        onClose={() => setAddMemberVisible(false)}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ['workshop', id] })}
      />
      {workshop.scriptSlug ? <ScriptViewer slug={workshop.scriptSlug} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, padding: spacing.md, gap: spacing.sm },
  message: { padding: spacing.lg, textAlign: 'center', color: colors.parchmentMuted },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: { fontSize: 20, fontWeight: '700', color: colors.parchment },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  liveText: { color: colors.accent, fontWeight: '600', fontSize: 13 },
  meta: { color: colors.parchmentMuted, fontSize: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.parchment, marginTop: spacing.sm },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  member: { paddingVertical: 4 },
  memberName: { color: colors.parchment, fontSize: 14 },
  memberMeta: { color: colors.parchmentMuted, fontSize: 13 },
  memberList: { maxHeight: 160 },
  removeLink: { color: colors.accent, fontSize: 12 },
  addMemberButton: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  addMemberButtonText: { color: colors.accent, fontWeight: '600', fontSize: 13 },
})
