import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LoginResult } from '@coral-studio/api-client'
import { apiClient, setUnauthorizedHandler } from '../api'
import { clearStoredToken, getStoredToken, setStoredToken } from './token-storage'

type AuthStatus = 'loading' | 'signedIn' | 'signedOut'

type AuthContextValue = {
  status: AuthStatus
  user: LoginResult['user'] | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<LoginResult['user'] | null>(null)

  useEffect(() => {
    getStoredToken().then((token) => setStatus(token ? 'signedIn' : 'signedOut'))
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setStatus('signedOut')
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async signIn(email: string, password: string) {
        const result = await apiClient.login(email, password)
        await setStoredToken(result.token)
        setUser(result.user)
        setStatus('signedIn')
      },
      async signOut() {
        await clearStoredToken()
        setUser(null)
        setStatus('signedOut')
      },
    }),
    [status, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
