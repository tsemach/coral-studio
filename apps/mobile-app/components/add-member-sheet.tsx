import { useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { colors, radius, spacing } from '../lib/theme'

export function AddMemberSheet({
  workshopId,
  visible,
  onClose,
  onAdded,
}: {
  workshopId: string
  visible: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const [email, setEmail] = useState('')
  const [part, setPart] = useState('')
  const [error, setError] = useState<string | null>(null)

  const activeUsersQuery = useQuery({
    queryKey: ['active-users'],
    queryFn: () => apiClient.listActiveUsers(),
    enabled: visible,
  })

  const mutation = useMutation({
    mutationFn: () => apiClient.addWorkshopMember(workshopId, { email: email.trim(), part: part.trim() || undefined }),
    onSuccess: () => {
      setEmail('')
      setPart('')
      setError(null)
      onAdded()
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Something went wrong.'),
  })

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add member</Text>
          <TextInput
            style={styles.input}
            placeholder="member@example.com"
            placeholderTextColor={colors.parchmentMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Part (optional)"
            placeholderTextColor={colors.parchmentMuted}
            value={part}
            onChangeText={setPart}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.hint}>Active studio members:</Text>
          <FlatList
            data={activeUsersQuery.data ?? []}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <Pressable style={styles.userRow} onPress={() => setEmail(item.email)}>
                <Text style={styles.userText}>{item.name ?? item.email}</Text>
              </Pressable>
            )}
          />

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.addButton} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.addButtonText}>Add</Text>
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
  sheet: { backgroundColor: colors.ink, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg, gap: spacing.sm, maxHeight: '80%' },
  title: { color: colors.parchment, fontSize: 18, fontWeight: '700' },
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
  error: { color: colors.accent, fontSize: 13 },
  hint: { color: colors.parchmentMuted, fontSize: 12, marginTop: spacing.xs },
  list: { maxHeight: 140 },
  userRow: { paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.hairline },
  userText: { color: colors.parchment, fontSize: 14 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: colors.parchmentMuted, fontWeight: '600' },
  addButton: { flex: 1, backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  addButtonText: { color: colors.primaryForeground, fontWeight: '600' },
})
