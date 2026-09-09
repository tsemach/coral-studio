import * as SecureStore from 'expo-secure-store'
import type { LoginResult } from '@coral-studio/api-client'

const TOKEN_KEY = 'coral-studio-mobile-token'
const USER_KEY = 'coral-studio-mobile-user'

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export async function getStoredUser(): Promise<LoginResult['user'] | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY)
  return raw ? (JSON.parse(raw) as LoginResult['user']) : null
}

export async function setStoredUser(user: LoginResult['user']): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
}

export async function clearStoredUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY)
}
