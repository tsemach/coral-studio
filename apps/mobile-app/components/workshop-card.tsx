import { Pressable, StyleSheet, Text } from 'react-native'
import type { WorkshopListItemDTO } from '@coral-studio/types'
import { colors, fonts, radius, spacing } from '../lib/theme'

export function WorkshopCard({ workshop, onPress }: { workshop: WorkshopListItemDTO; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <Text style={styles.title}>{workshop.title}</Text>
      <Text style={styles.meta}>
        {workshop.rehearsalAt ? new Date(workshop.rehearsalAt).toLocaleString() : 'No rehearsal scheduled'}
      </Text>
      <Text style={styles.meta}>
        {workshop.memberCount} member{workshop.memberCount === 1 ? '' : 's'}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.inkCard,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  cardPressed: { opacity: 0.8 },
  title: { fontFamily: fonts.serif, fontSize: 18, color: colors.parchment },
  meta: { color: colors.parchmentMuted, marginTop: spacing.xs, fontSize: 13 },
})
