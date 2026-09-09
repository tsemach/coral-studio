import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { assignCharacterColorsRN } from '@coral-studio/types'
import { apiClient } from '../lib/api'

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
  const colors = assignCharacterColorsRN(characters)

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
              <Text style={{ color: colors[entry.character], fontWeight: '700' }}>{entry.character}: </Text>
              {entry.line}
            </Text>
          )
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  message: { padding: 24, textAlign: 'center', color: '#666' },
  container: { flex: 1, marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  scene: { color: '#666', marginBottom: 8 },
  scroll: { flex: 1 },
  action: { fontStyle: 'italic', color: '#444', marginVertical: 4 },
  dialogue: { marginVertical: 4 },
})
