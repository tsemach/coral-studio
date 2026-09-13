import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { assignCharacterColorsRN } from '@coral-studio/types'
import { apiClient } from '../lib/api'
import { colors, radius, spacing } from '../lib/theme'

// Matches studio-web's font-size-control.tsx bounds/step exactly.
const DEFAULT_FONT_SIZE = 14
const MIN_FONT_SIZE = 10
const MAX_FONT_SIZE = 20
const FONT_SIZE_STEP = 1

export function ScriptViewer({ slug }: { slug: string }) {
  const { data: script, isLoading, error } = useQuery({
    queryKey: ['script', slug],
    queryFn: () => apiClient.getScript(slug),
  })
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)

  if (isLoading) return <Text style={styles.message}>Loading script…</Text>
  if (error || !script) return <Text style={styles.message}>Could not load the script.</Text>

  const characters = Array.from(
    new Set(script.script_flow.filter((entry) => entry.type === 'dialogue').map((entry) => entry.character))
  )
  const characterColors = assignCharacterColorsRN(characters)
  const canIncrease = fontSize < MAX_FONT_SIZE
  const canDecrease = fontSize > MIN_FONT_SIZE

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.sectionTitle}>{script.title}</Text>
          <Text style={styles.scene}>{script.scene}</Text>
        </View>
        <View style={styles.fontControl}>
          <Pressable
            style={styles.fontButton}
            disabled={!canIncrease}
            onPress={() => setFontSize((size) => Math.min(MAX_FONT_SIZE, size + FONT_SIZE_STEP))}
            hitSlop={6}
          >
            <Text style={[styles.fontButtonText, !canIncrease && styles.fontButtonTextDisabled]}>▲</Text>
          </Pressable>
          <Pressable
            style={styles.fontButton}
            disabled={!canDecrease}
            onPress={() => setFontSize((size) => Math.max(MIN_FONT_SIZE, size - FONT_SIZE_STEP))}
            hitSlop={6}
          >
            <Text style={[styles.fontButtonText, !canDecrease && styles.fontButtonTextDisabled]}>▼</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView style={styles.scroll}>
        {script.script_flow.map((entry, index) =>
          entry.type === 'action' ? (
            <Text key={index} style={[styles.action, { fontSize }]}>
              {entry.text}
            </Text>
          ) : (
            // Character name on its own centered line above the dialogue line,
            // matching studio-web's single-column ScriptFlow layout (not
            // inlined on one row the way this used to render).
            <View key={index} style={styles.dialogueBlock}>
              <Text style={[styles.characterName, { color: characterColors[entry.character], fontSize: fontSize * 0.93 }]}>
                {entry.character}
              </Text>
              <Text style={[styles.dialogueLine, { fontSize }]}>{entry.line}</Text>
            </View>
          )
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  message: { padding: spacing.lg, textAlign: 'center', color: colors.parchmentMuted },
  container: {
    flex: 1,
    marginTop: spacing.md,
    backgroundColor: colors.inkCard,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  headerText: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.parchment },
  scene: { color: colors.parchmentMuted, fontStyle: 'italic', marginTop: 2, marginBottom: spacing.sm, fontSize: 13 },
  fontControl: { flexDirection: 'row', borderRadius: radius, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden' },
  fontButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  fontButtonText: { color: colors.parchmentMuted, fontSize: 11 },
  fontButtonTextDisabled: { opacity: 0.3 },
  scroll: { flex: 1 },
  action: { textAlign: 'center', fontStyle: 'italic', color: colors.parchmentMuted, marginVertical: 6, lineHeight: 20 },
  dialogueBlock: { alignItems: 'center', marginVertical: 6, gap: 2 },
  characterName: { fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  dialogueLine: { color: colors.parchment, textAlign: 'center', lineHeight: 20 },
})
