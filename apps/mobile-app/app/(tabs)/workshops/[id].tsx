import { useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api'
import { ScriptViewer } from '../../../components/script-viewer'
import { AddMemberSheet } from '../../../components/add-member-sheet'
import { ScheduleRehearsalSheet } from '../../../components/schedule-rehearsal-sheet'
import { colors, radius, spacing } from '../../../lib/theme'

const LIVE_POLL_INTERVAL_MS = 8000

export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [addMemberVisible, setAddMemberVisible] = useState(false)
  const [scheduleVisible, setScheduleVisible] = useState(false)

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

  const cancelRehearsalMutation = useMutation({
    mutationFn: () => apiClient.cancelWorkshopRehearsal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workshop', id] }),
  })

  const leaveMutation = useMutation({
    mutationFn: () => apiClient.leaveWorkshop(id),
    onSuccess: () => router.replace('/workshops'),
  })

  function confirmLeaveWorkshop() {
    Alert.alert('Leave workshop?', 'You can be added back later by another member.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
    ])
  }

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
      <View style={styles.rehearsalActions}>
        <Pressable onPress={() => setScheduleVisible(true)}>
          <Text style={styles.actionLink}>{workshop.rehearsalAt ? 'Reschedule' : 'Schedule rehearsal'}</Text>
        </Pressable>
        {workshop.rehearsalAt ? (
          <Pressable onPress={() => cancelRehearsalMutation.mutate()}>
            <Text style={styles.actionLink}>Cancel rehearsal</Text>
          </Pressable>
        ) : null}
      </View>

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
      <Pressable onPress={confirmLeaveWorkshop} style={styles.leaveButton}>
        <Text style={styles.leaveButtonText}>Leave workshop</Text>
      </Pressable>
      <ScheduleRehearsalSheet
        workshopId={id}
        visible={scheduleVisible}
        onClose={() => setScheduleVisible(false)}
        onScheduled={() => queryClient.invalidateQueries({ queryKey: ['workshop', id] })}
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
  rehearsalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  actionLink: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  leaveButton: { marginTop: spacing.md, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  leaveButtonText: { color: colors.parchmentMuted, fontWeight: '600', fontSize: 14 },
})
