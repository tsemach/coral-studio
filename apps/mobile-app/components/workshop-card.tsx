import { Pressable, StyleSheet, Text } from 'react-native'
import type { WorkshopListItemDTO } from '@coral-studio/types'

export function WorkshopCard({ workshop, onPress }: { workshop: WorkshopListItemDTO; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
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
  card: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#666', marginTop: 4 },
})
