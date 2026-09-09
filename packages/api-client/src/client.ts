import type { Script, WorkshopDetailDTO, WorkshopListItemDTO } from '@coral-studio/types'
import { ApiError } from './errors'

export type ApiClientConfig = {
  baseUrl: string
  getToken: () => Promise<string | null>
  onUnauthorized: () => void
}

export type LoginResult = {
  token: string
  user: { id: string; name: string | null; email: string; image: string | null }
}

export type WorkshopLiveStatus = { live: boolean }

export function createApiClient(config: ApiClientConfig) {
  async function request<T>(
    path: string,
    options: { method?: string; body?: unknown; auth?: boolean } = {}
  ): Promise<T> {
    const requiresAuth = options.auth ?? true
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (requiresAuth) {
      const token = await config.getToken()
      if (!token) {
        config.onUnauthorized()
        throw new ApiError(401, 'Not signed in.')
      }
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${config.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      if (response.status === 401) config.onUnauthorized()
      const message =
        payload && typeof payload === 'object' && 'error' in payload ? String((payload as { error: unknown }).error) : 'Request failed.'
      throw new ApiError(response.status, message)
    }

    return payload as T
  }

  return {
    login(email: string, password: string): Promise<LoginResult> {
      return request<LoginResult>('/api/mobile/auth/login', { method: 'POST', body: { email, password }, auth: false })
    },
    getWorkshops(): Promise<WorkshopListItemDTO[]> {
      return request<WorkshopListItemDTO[]>('/api/mobile/workshops')
    },
    getWorkshopDetail(id: string): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>(`/api/mobile/workshops/${id}`)
    },
    getWorkshopLiveStatus(id: string): Promise<WorkshopLiveStatus> {
      return request<WorkshopLiveStatus>(`/api/mobile/workshops/${id}/live-status`)
    },
    getScript(slug: string): Promise<Script> {
      return request<Script>(`/api/mobile/scripts/${slug}`)
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
