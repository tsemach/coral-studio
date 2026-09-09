import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LoginResult } from '@coral-studio/api-client'
import { apiClient, setUnauthorizedHandler } from '../api'
import {
  clearStoredToken,
  clearStoredUser,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from './token-storage'

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
    Promise.all([getStoredToken(), getStoredUser()])
      .then(([token, storedUser]) => {
        if (token) {
          setUser(storedUser)
          setStatus('signedIn')
        } else {
          setStatus('signedOut')
        }
      })
      .catch(() => setStatus('signedOut'))
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setStatus('signedOut')
      void clearStoredUser()
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async signIn(email: string, password: string) {
        const result = await apiClient.login(email, password)
        await Promise.all([setStoredToken(result.token), setStoredUser(result.user)])
        setUser(result.user)
        setStatus('signedIn')
      },
      async signOut() {
        await Promise.all([clearStoredToken(), clearStoredUser()])
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
