import { useEffect, type ReactNode } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../lib/auth/auth-context'
import { queryClient } from '../lib/query-client'

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  return <>{children}</>
}

export default function RootLayout() {
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
