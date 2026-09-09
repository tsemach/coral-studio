import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { assignCharacterColorsRN } from '@coral-studio/types'
import { apiClient } from '../lib/api'
import { colors, fonts, radius, spacing } from '../lib/theme'

export function ScriptViewer({ slug }: { slug: string }) {
  const { data: script, isLoading, error } = useQuery({
    queryKey: ['script', slug],
    queryFn: () => apiClient.getScript(slug),
  })

  if (isLoading) return <Text style={styles.message}>Loading script…</Text>
  if (error || !script) return <Text style={styles.message}>Could not load the script.</Text>

  const characters = Array.from(
    new Set(script.script_flow.filter((entry) => entry.type === 'dialogue').map((entry) => entry.character))
  )
  const characterColors = assignCharacterColorsRN(characters)

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{script.title}</Text>
      <Text style={styles.scene}>{script.scene}</Text>
      <ScrollView style={styles.scroll}>
        {script.script_flow.map((entry, index) =>
          entry.type === 'action' ? (
            <Text key={index} style={styles.action}>
              {entry.text}
            </Text>
          ) : (
            <Text key={index} style={styles.dialogue}>
              <Text style={{ color: characterColors[entry.character], fontWeight: '700' }}>{entry.character}</Text>
              <Text style={styles.dialogueLine}>  {entry.line}</Text>
            </Text>
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
  sectionTitle: { fontFamily: fonts.serif, fontSize: 16, color: colors.parchment },
  scene: { color: colors.parchmentMuted, fontStyle: 'italic', marginTop: 2, marginBottom: spacing.sm, fontSize: 13 },
  scroll: { flex: 1 },
  action: { fontStyle: 'italic', color: colors.parchmentMuted, marginVertical: 6, lineHeight: 20 },
  dialogue: { marginVertical: 6, lineHeight: 20 },
  dialogueLine: { color: colors.parchment },
})
