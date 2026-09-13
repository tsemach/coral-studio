import { useEffect, type ReactNode } from 'react'
import { ActivityIndicator, LogBox, View } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { useFonts, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces'
import * as SplashScreen from 'expo-splash-screen'
import '../lib/livekit-setup'
import { AuthProvider, useAuth } from '../lib/auth/auth-context'
import { queryClient } from '../lib/query-client'
import { colors } from '../lib/theme'

SplashScreen.preventAutoHideAsync()

// LiveKit's client logs a console.error for a transient signal-socket
// reconnect race during the initial connection handshake -- observed
// consistently on real devices, but the room connection itself recovers
// and works fine regardless (video/audio/controls unaffected). This is a
// dev-mode-only LogBox overlay; a release build never shows it to users,
// it would just be a silent log line -- ignoring it here only removes the
// intrusive dev popup, not any real error handling.
LogBox.ignoreLogs(['error reading from signal stream'])

function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    const onLoginScreen = segments[0] === 'login'

    if (status === 'signedOut' && !onLoginScreen) {
      router.replace('/login')
    } else if (status === 'signedIn' && onLoginScreen) {
      router.replace('/(tabs)/workshops')
    }
  }, [status, segments, router])

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  return <>{children}</>
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fraunces_600SemiBold })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <Slot />
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  )
}
