import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { colors, radius, spacing } from '../lib/theme'

// Builds a local-time "YYYY-MM-DDTHH:mm" string -- must stay in sync with
// handleSave's `new Date(trimmed)`, which parses this shape as local time
// (no offset suffix). Using toISOString() here would seed the field in UTC
// while save parses local, silently shifting the rehearsal by the device's
// UTC offset if the user saves without re-editing the field.
function formatForLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

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
  const [rehearsalAt, setRehearsalAt] = useState('')
  const [location, setLocation] = useState<'studio' | 'online'>('studio')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setRehearsalAt(currentRehearsalAt ? formatForLocalInput(new Date(currentRehearsalAt)) : '')
      setError(null)
    }
  }, [visible, currentRehearsalAt])

  const mutation = useMutation({
    mutationFn: (parsedRehearsalAt: Date | null) =>
      apiClient.setWorkshopRehearsal(workshopId, {
        rehearsalAt: parsedRehearsalAt ? parsedRehearsalAt.toISOString() : null,
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

  function handleSave() {
    const trimmed = rehearsalAt.trim()
    if (!trimmed) {
      mutation.mutate(null)
      return
    }
    const parsedRehearsalAt = new Date(trimmed)
    if (Number.isNaN(parsedRehearsalAt.getTime())) {
      setError('Enter a date like 2026-10-01T18:00.')
      return
    }
    mutation.mutate(parsedRehearsalAt)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Schedule rehearsal</Text>
          <Text style={styles.hint}>Date and time (e.g. 2026-10-01T18:00)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-10-01T18:00"
            placeholderTextColor={colors.parchmentMuted}
            value={rehearsalAt}
            onChangeText={setRehearsalAt}
          />
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
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.ink, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.parchment, fontSize: 18, fontWeight: '700' },
  hint: { color: colors.parchmentMuted, fontSize: 12 },
  input: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.parchment,
    fontSize: 15,
  },
  locationRow: { flexDirection: 'row', gap: spacing.sm },
  locationOption: { flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 10, alignItems: 'center' },
  locationOptionActive: { borderColor: colors.accent },
  locationOptionText: { color: colors.parchment, fontSize: 14 },
  error: { color: colors.accent, fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: colors.parchmentMuted, fontWeight: '600' },
  saveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  saveButtonText: { color: colors.primaryForeground, fontWeight: '600' },
})
