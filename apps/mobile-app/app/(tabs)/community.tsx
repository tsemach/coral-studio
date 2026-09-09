import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../../lib/theme'

export default function CommunityPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community</Text>
      <Text style={styles.text}>The feed, casting board, and tape room are coming soon.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.xs },
  title: { fontSize: 18, fontWeight: '700', color: colors.parchment },
  text: { color: colors.parchmentMuted, fontSize: 15, textAlign: 'center' },
})
