import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api'
import { colors, radius, spacing } from '../../../lib/theme'

export default function NewWorkshopScreen() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [scriptSlug, setScriptSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const scriptsQuery = useQuery({ queryKey: ['scripts'], queryFn: () => apiClient.listScripts() })

  const mutation = useMutation({
    mutationFn: () => apiClient.createWorkshop({ title: title.trim() || undefined, scriptSlug }),
    onSuccess: (workshop) => router.replace(`/workshops/${workshop.id}`),
    onError: (err) => setError(err instanceof Error ? err.message : 'Something went wrong.'),
  })

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Untitled workshop"
        placeholderTextColor={colors.parchmentMuted}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Script (optional)</Text>
      {scriptsQuery.isLoading ? (
        <Text style={styles.meta}>Loading scripts…</Text>
      ) : (
        <View style={styles.scriptList}>
          <Pressable
            style={[styles.scriptOption, scriptSlug === null && styles.scriptOptionActive]}
            onPress={() => setScriptSlug(null)}
          >
            <Text style={styles.scriptOptionText}>No script</Text>
          </Pressable>
          {(scriptsQuery.data ?? []).map((script) => (
            <Pressable
              key={script.slug}
              style={[styles.scriptOption, scriptSlug === script.slug && styles.scriptOptionActive]}
              onPress={() => setScriptSlug(script.slug)}
            >
              <Text style={styles.scriptOptionText}>{script.title}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={styles.buttonText}>Create workshop</Text>
        )}
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  content: { padding: spacing.md, gap: spacing.sm },
  label: { color: colors.parchmentMuted, fontSize: 13, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.parchment,
    fontSize: 16,
  },
  meta: { color: colors.parchmentMuted, fontSize: 13 },
  scriptList: { gap: spacing.xs },
  scriptOption: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  scriptOptionActive: { borderColor: colors.accent },
  scriptOptionText: { color: colors.parchment, fontSize: 14 },
  error: { color: colors.accent, fontSize: 14 },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 16 },
})
