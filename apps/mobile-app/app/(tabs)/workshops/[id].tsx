import { useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api'
import { ScriptViewer } from '../../../components/script-viewer'
import { AddMemberSheet } from '../../../components/add-member-sheet'
import { ScheduleRehearsalSheet } from '../../../components/schedule-rehearsal-sheet'
import { WorkshopMenu } from '../../../components/workshop-menu'
import { colors, pillRadius, radius, spacing } from '../../../lib/theme'

const LIVE_POLL_INTERVAL_MS = 8000

type DetailTab = 'script' | 'group'

export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [addMemberVisible, setAddMemberVisible] = useState(false)
  const [scheduleVisible, setScheduleVisible] = useState(false)
  // Script is the default tab on entering a workshop's details, matching
  // studio-web's centered single-column ScriptFlow as the primary view.
  const [activeTab, setActiveTab] = useState<DetailTab>('script')

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop', id] })
      queryClient.invalidateQueries({ queryKey: ['workshops'] })
    },
  })

  const cancelRehearsalMutation = useMutation({
    mutationFn: () => apiClient.cancelWorkshopRehearsal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop', id] })
      queryClient.invalidateQueries({ queryKey: ['workshops'] })
    },
  })

  const leaveMutation = useMutation({
    mutationFn: () => apiClient.leaveWorkshop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] })
      router.replace('/workshops')
    },
  })

  function confirmLeaveWorkshop() {
    Alert.alert('Leave workshop?', 'You can be added back later by another member.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
    ])
  }

  function confirmRemoveMember(memberId: string, memberName: string) {
    Alert.alert(`Remove ${memberName}?`, 'They can be added back later.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMemberMutation.mutate(memberId) },
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
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>{workshop.title}</Text>
          <Pressable
            style={[styles.goLiveButton, liveQuery.data?.live && styles.goLiveButtonActive]}
            onPress={() => router.push(`/workshops/live/${id}`)}
          >
            {liveQuery.data?.live ? <View style={styles.liveDot} /> : null}
            <Text style={styles.goLiveButtonText}>{liveQuery.data?.live ? 'Live · Join' : 'Go live'}</Text>
          </Pressable>
        </View>
        <WorkshopMenu
          hasRehearsal={!!workshop.rehearsalAt}
          onReschedule={() => setScheduleVisible(true)}
          onAddMember={() => setAddMemberVisible(true)}
          onCancelRehearsal={() => cancelRehearsalMutation.mutate()}
          onLeave={confirmLeaveWorkshop}
        />
      </View>
      <Text style={styles.meta}>
        {workshop.rehearsalAt ? new Date(workshop.rehearsalAt).toLocaleString() : 'No rehearsal scheduled'}
        {workshop.location ? ` · ${workshop.location}` : ''}
      </Text>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeTab === 'script' && styles.tabActive]}
          onPress={() => setActiveTab('script')}
        >
          <Text style={styles.tabText}>Script</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'group' && styles.tabActive]}
          onPress={() => setActiveTab('group')}
        >
          <Text style={styles.tabText}>Group</Text>
        </Pressable>
      </View>

      {activeTab === 'script' ? (
        workshop.scriptSlug ? (
          <ScriptViewer slug={workshop.scriptSlug} />
        ) : (
          <Text style={styles.message}>No script attached.</Text>
        )
      ) : (
        <View style={styles.groupContent}>
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
                <Pressable onPress={() => confirmRemoveMember(item.id, item.name ?? item.email)}>
                  <Text style={styles.removeLink}>Remove</Text>
                </Pressable>
              </View>
            )}
            style={styles.memberList}
          />

          <Text style={styles.sectionTitle}>Rehearsal</Text>
          <View style={styles.rehearsalCard}>
            {workshop.rehearsalAt ? (
              <Pressable
                style={styles.rehearsalCancel}
                onPress={() => cancelRehearsalMutation.mutate()}
                disabled={cancelRehearsalMutation.isPending}
                hitSlop={6}
              >
                <Text style={styles.rehearsalCancelText}>×</Text>
              </Pressable>
            ) : null}
            <Text style={styles.rehearsalDate}>
              {workshop.rehearsalAt ? new Date(workshop.rehearsalAt).toLocaleString() : 'No rehearsal scheduled'}
            </Text>
            {workshop.rehearsalAt && workshop.location ? (
              <Text style={styles.rehearsalLocation}>{workshop.location}</Text>
            ) : null}
          </View>
          <Text style={styles.rehearsalHint}>Set from "Schedule rehearsal" in the workshop's menu.</Text>
        </View>
      )}

      <AddMemberSheet
        workshopId={id}
        visible={addMemberVisible}
        onClose={() => setAddMemberVisible(false)}
        onAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['workshop', id] })
          queryClient.invalidateQueries({ queryKey: ['workshops'] })
        }}
      />
      <ScheduleRehearsalSheet
        workshopId={id}
        visible={scheduleVisible}
        currentRehearsalAt={workshop.rehearsalAt}
        onClose={() => setScheduleVisible(false)}
        onScheduled={() => {
          queryClient.invalidateQueries({ queryKey: ['workshop', id] })
          queryClient.invalidateQueries({ queryKey: ['workshops'] })
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, padding: spacing.md, gap: spacing.sm },
  message: { padding: spacing.lg, textAlign: 'center', color: colors.parchmentMuted },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', flexShrink: 1 },
  title: { fontSize: 20, fontWeight: '700', color: colors.parchment },
  goLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: pillRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  goLiveButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primaryForeground },
  goLiveButtonText: { color: colors.parchment, fontWeight: '600', fontSize: 13 },
  meta: { color: colors.parchmentMuted, fontSize: 14 },
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  tab: {
    flex: 1,
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: pillRadius,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: { borderColor: colors.accent },
  tabText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
  groupContent: { flex: 1, gap: spacing.xs },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.parchment, marginTop: spacing.sm },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: pillRadius,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  member: { flexShrink: 1 },
  memberName: { color: colors.parchment, fontSize: 14 },
  memberMeta: { color: colors.parchmentMuted, fontSize: 13 },
  memberList: { maxHeight: 220 },
  removeLink: { color: colors.accent, fontSize: 12 },
  rehearsalCard: {
    position: 'relative',
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    padding: spacing.md,
    paddingRight: spacing.lg,
  },
  rehearsalCancel: { position: 'absolute', top: spacing.xs, right: spacing.xs, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  rehearsalCancelText: { color: colors.parchmentMuted, fontSize: 15, lineHeight: 15 },
  rehearsalDate: { color: colors.parchment, fontSize: 14 },
  rehearsalLocation: { color: colors.parchmentMuted, fontSize: 13, marginTop: 2 },
  rehearsalHint: { color: colors.parchmentMuted, fontSize: 12, marginTop: spacing.xs },
})
