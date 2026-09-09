import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../lib/auth/auth-context'
import { colors, radius, spacing } from '../../lib/theme'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.name ?? user?.email}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={signOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, padding: spacing.lg, gap: spacing.xs },
  name: { fontSize: 20, fontWeight: '700', color: colors.parchment },
  email: { color: colors.parchmentMuted, fontSize: 14 },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: colors.parchment, fontWeight: '600', fontSize: 15 },
})
