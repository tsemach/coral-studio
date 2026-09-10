import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useVideoPlayer, VideoView } from 'expo-video'
import type { TapeNoteTag } from '@coral-studio/types'
import { apiClient } from '../../../../lib/api'
import { colors, radius, spacing } from '../../../../lib/theme'

const TAGS: { id: TapeNoteTag; label: string }[] = [
  { id: 'objective_action', label: 'Objective/action' },
  { id: 'truthfulness_listening', label: 'Truthfulness/listening' },
  { id: 'vocal_physicality', label: 'Vocal/physicality' },
  { id: 'framing_eyeline', label: 'Framing/eyeline' },
]

export default function TapeDetailScreen() {
  const { tapeId } = useLocalSearchParams<{ tapeId: string }>()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [tag, setTag] = useState<TapeNoteTag | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoUrlQuery = useQuery({
    queryKey: ['tape-video-url', tapeId],
    queryFn: () => apiClient.getTapeVideoUrl(tapeId),
    enabled: !!tapeId,
  })

  const notesQuery = useQuery({
    queryKey: ['tape-notes', tapeId],
    queryFn: () => apiClient.listTapeNotes(tapeId),
    enabled: !!tapeId,
  })

  const player = useVideoPlayer(videoUrlQuery.data?.url ?? null, (p) => {
    p.loop = false
  })

  const addNoteMutation = useMutation({
    mutationFn: () =>
      apiClient.addTapeNote(tapeId, {
        timestampSeconds: Math.floor(player.currentTime),
        content: draft.trim(),
        tag,
      }),
    onSuccess: () => {
      setError(null)
      setDraft('')
      setTag(null)
      queryClient.invalidateQueries({ queryKey: ['tape-notes', tapeId] })
      // The tape-room list (community/index.tsx, query key ['tapes']) renders
      // TapeCard, which displays notesCount -- keep it fresh too.
      queryClient.invalidateQueries({ queryKey: ['tapes'] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Something went wrong.'),
  })

  if (videoUrlQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading…</Text>
      </View>
    )
  }
  if (videoUrlQuery.error || !videoUrlQuery.data) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Could not load this tape.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <VideoView style={styles.video} player={player} nativeControls />
      <FlatList
        data={notesQuery.data ?? []}
        keyExtractor={(note) => note.id}
        style={styles.notesList}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Notes</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.noteRow} onPress={() => player.currentTime = item.timestampSeconds}>
            <Text style={styles.noteTimestamp}>{formatTimestamp(item.timestampSeconds)}</Text>
            <View style={styles.noteBody}>
              {item.tag ? <Text style={styles.noteTag}>{item.tag.replace('_', ' ')}</Text> : null}
              <Text style={styles.noteContent}>{item.content}</Text>
              <Text style={styles.noteAuthor}>{item.authorName ?? 'Unknown'}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.message}>No notes yet.</Text>}
      />
      <View style={styles.tagRow}>
        {TAGS.map((t) => (
          <Pressable key={t.id} style={[styles.tagOption, tag === t.id && styles.tagOptionActive]} onPress={() => setTag(tag === t.id ? null : t.id)}>
            <Text style={styles.tagOptionText}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Add a note at the current timestamp…"
          placeholderTextColor={colors.parchmentMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable
          style={styles.sendButton}
          disabled={!draft.trim() || addNoteMutation.isPending}
          onPress={() => addNoteMutation.mutate()}
        >
          <Text style={styles.sendButtonText}>Add</Text>
        </Pressable>
      </View>
    </View>
  )
}

function formatTimestamp(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  message: { padding: 24, textAlign: 'center', color: colors.parchmentMuted },
  video: { width: '100%', height: 240, backgroundColor: '#000' },
  notesList: { flex: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.parchment, margin: spacing.md, marginBottom: spacing.xs },
  noteRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderColor: colors.hairline },
  noteTimestamp: { color: colors.accent, fontWeight: '700', fontSize: 13, width: 40 },
  noteBody: { flex: 1, gap: 2 },
  noteTag: { color: colors.parchmentMuted, fontSize: 11, textTransform: 'uppercase' },
  noteContent: { color: colors.parchment },
  noteAuthor: { color: colors.parchmentMuted, fontSize: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  tagOption: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  tagOptionActive: { borderColor: colors.accent },
  tagOptionText: { color: colors.parchment, fontSize: 12 },
  error: { color: colors.accent, fontSize: 14, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  composer: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm + spacing.xs, borderTopWidth: 1, borderColor: colors.hairline },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    padding: 10,
    maxHeight: 100,
    backgroundColor: colors.inkCard,
    color: colors.parchment,
  },
  sendButton: { backgroundColor: colors.primary, borderRadius: radius, paddingHorizontal: spacing.md, justifyContent: 'center' },
  sendButtonText: { color: colors.primaryForeground, fontWeight: '600' },
})
