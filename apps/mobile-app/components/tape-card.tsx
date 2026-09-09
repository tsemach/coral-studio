import { Pressable, StyleSheet, Text } from 'react-native'
import type { TapeItemDTO } from '@coral-studio/types'
import { colors, spacing } from '../lib/theme'

export function TapeCard({ tape, onPress }: { tape: TapeItemDTO; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <Text style={styles.title}>{tape.title}</Text>
      <Text style={styles.author}>{tape.authorName ?? 'Unknown'}</Text>
      <Text style={styles.meta}>
        {tape.notesCount} note{tape.notesCount === 1 ? '' : 's'}
        {tape.durationSeconds ? ` · ${Math.round(tape.durationSeconds)}s` : ''}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.hairline, backgroundColor: colors.ink },
  cardPressed: { opacity: 0.8 },
  title: { fontSize: 16, fontWeight: '600', color: colors.parchment },
  author: { color: colors.parchmentMuted, marginTop: 2 },
  meta: { color: colors.parchmentMuted, marginTop: spacing.xs, fontSize: 13 },
})
