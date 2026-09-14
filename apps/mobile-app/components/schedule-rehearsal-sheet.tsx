import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { colors, radius, spacing } from '../lib/theme'

export function ScheduleRehearsalSheet({
  workshopId,
  visible,
  currentRehearsalAt,
  onClose,
  onScheduled,
}: {
  workshopId: string
  visible: boolean
  currentRehearsalAt: string | null
  onClose: () => void
  onScheduled: () => void
}) {
  const [rehearsalAt, setRehearsalAt] = useState<Date | null>(null)
  const [location, setLocation] = useState<'studio' | 'online'>('studio')
  const [showIosPicker, setShowIosPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (visible) {
      setRehearsalAt(currentRehearsalAt ? new Date(currentRehearsalAt) : null)
      setError(null)
    }
  }, [visible, currentRehearsalAt])

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.setWorkshopRehearsal(workshopId, {
        rehearsalAt: rehearsalAt ? rehearsalAt.toISOString() : null,
        location,
        syncCalendar: false,
      }),
    onSuccess: () => {
      setError(null)
      onScheduled()
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Something went wrong.'),
  })

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: rehearsalAt ?? new Date(),
        mode: 'date',
        onChange: (event, pickedDate) => {
          if (event.type !== 'set' || !pickedDate) return
          DateTimePickerAndroid.open({
            value: pickedDate,
            mode: 'time',
            onChange: (timeEvent, pickedTime) => {
              if (timeEvent.type !== 'set' || !pickedTime) return
              setRehearsalAt(pickedTime)
            },
          })
        },
      })
    } else {
      setShowIosPicker(true)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior="padding">
        <View style={styles.sheet}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Schedule rehearsal</Text>
            <Text style={styles.hint}>Date and time</Text>
            <Pressable style={styles.dateButton} onPress={openPicker}>
              <Text style={styles.dateButtonText}>
                {rehearsalAt ? rehearsalAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Pick a date & time'}
              </Text>
            </Pressable>
            {rehearsalAt ? (
              <Pressable onPress={() => setRehearsalAt(null)}>
                <Text style={styles.clearLink}>Clear</Text>
              </Pressable>
            ) : null}
            {Platform.OS === 'ios' && showIosPicker ? (
              <DateTimePicker
                value={rehearsalAt ?? new Date()}
                mode="datetime"
                display="spinner"
                onChange={(event, pickedDate) => {
                  setShowIosPicker(false)
                  if (event.type === 'set' && pickedDate) setRehearsalAt(pickedDate)
                }}
              />
            ) : null}
            <View style={styles.locationRow}>
              <Pressable
                style={[styles.locationOption, location === 'studio' && styles.locationOptionActive]}
                onPress={() => setLocation('studio')}
              >
                <Text style={styles.locationOptionText}>Studio</Text>
              </Pressable>
              <Pressable
                style={[styles.locationOption, location === 'online' && styles.locationOptionActive]}
                onPress={() => setLocation('online')}
              >
                <Text style={styles.locationOptionText}>Online</Text>
              </Pressable>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.ink, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%' },
  scroll: { flexShrink: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.parchment, fontSize: 18, fontWeight: '700' },
  hint: { color: colors.parchmentMuted, fontSize: 12 },
  dateButton: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  dateButtonText: { color: colors.parchment, fontSize: 15 },
  clearLink: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  locationRow: { flexDirection: 'row', gap: spacing.sm },
  locationOption: { flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 10, alignItems: 'center' },
  locationOptionActive: { borderColor: colors.accent },
  locationOptionText: { color: colors.parchment, fontSize: 14 },
  error: { color: colors.accent, fontSize: 13 },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.hairline,
  },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: colors.parchmentMuted, fontWeight: '600' },
  saveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  saveButtonText: { color: colors.primaryForeground, fontWeight: '600' },
})
