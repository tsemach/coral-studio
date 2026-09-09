import { createApiClient } from '@coral-studio/api-client'
import { clearStoredToken, getStoredToken } from './auth/token-storage'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL

if (!API_BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not set')
}

let onUnauthorizedHandler: () => void = () => {}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorizedHandler = handler
}

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getToken: getStoredToken,
  onUnauthorized: () => {
    clearStoredToken()
    onUnauthorizedHandler()
  },
})
