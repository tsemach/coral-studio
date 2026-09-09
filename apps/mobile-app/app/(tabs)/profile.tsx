import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../lib/auth/auth-context'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.name ?? user?.email}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  name: { fontSize: 20, fontWeight: '600' },
  email: { color: '#666' },
  button: { marginTop: 24, backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
})
