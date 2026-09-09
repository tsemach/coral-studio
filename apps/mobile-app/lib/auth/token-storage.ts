import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import type { LoginResult } from '@coral-studio/api-client'

const TOKEN_KEY = 'coral-studio-mobile-token'
const USER_KEY = 'coral-studio-mobile-user'

// expo-secure-store's web target has no real implementation (its web
// export throws "is not a function" on every call) -- fall back to
// localStorage on web, keeping SecureStore for native iOS/Android, where
// it's the correct, keychain-backed choice.
async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
  }
  return SecureStore.getItemAsync(key)
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
    return
  }
  await SecureStore.setItemAsync(key, value)
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
    return
  }
  await SecureStore.deleteItemAsync(key)
}

export async function getStoredToken(): Promise<string | null> {
  return getItem(TOKEN_KEY)
}

export async function setStoredToken(token: string): Promise<void> {
  await setItem(TOKEN_KEY, token)
}

export async function clearStoredToken(): Promise<void> {
  await deleteItem(TOKEN_KEY)
}

export async function getStoredUser(): Promise<LoginResult['user'] | null> {
  const raw = await getItem(USER_KEY)
  return raw ? (JSON.parse(raw) as LoginResult['user']) : null
}

export async function setStoredUser(user: LoginResult['user']): Promise<void> {
  await setItem(USER_KEY, JSON.stringify(user))
}

export async function clearStoredUser(): Promise<void> {
  await deleteItem(USER_KEY)
}
