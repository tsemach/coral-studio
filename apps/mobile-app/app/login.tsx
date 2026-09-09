import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { ApiError } from '@coral-studio/api-client'
import { useAuth } from '../lib/auth/auth-context'
import { colors, fonts, radius, spacing } from '../lib/theme'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch (err) {
      console.error('Sign-in failed:', err)
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Glumački Studio</Text>
        <Text style={styles.subtitle}>Sign in to see your workshops</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.parchmentMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.parchmentMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, justifyContent: 'center', padding: spacing.lg },
  header: { marginBottom: spacing.xl, alignItems: 'center' },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.parchment, textAlign: 'center' },
  subtitle: { marginTop: spacing.xs, fontSize: 15, color: colors.parchmentMuted, textAlign: 'center' },
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { fontSize: 13, color: colors.parchmentMuted },
  input: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.parchment,
    fontSize: 16,
  },
  error: { color: colors.accent, fontSize: 14 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buttonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 16 },
})
