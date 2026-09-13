import type {
  AddableUser,
  CastingType,
  CommunityChannel,
  CommunityPostDetailDTO,
  CommunityPostItemDTO,
  CommentWithAuthorDTO,
  ReaderOfferItemDTO,
  ReaderStatus,
  RehearsalFormat,
  Script,
  ScriptSummary,
  TapeItemDTO,
  TapeNoteItemDTO,
  TapeNoteTag,
  WorkshopDetailDTO,
  WorkshopListItemDTO,
} from '@coral-studio/types'
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

export type CommunityPostsPage = { items: CommunityPostItemDTO[]; nextCursor: string | null }
export type OffersResult = { offers: ReaderOfferItemDTO[]; hasOffered: boolean }

export function createApiClient(config: ApiClientConfig) {
  async function request<T>(
    path: string,
    options: { method?: string; body?: unknown; auth?: boolean } = {}
  ): Promise<T> {
    const requiresAuth = options.auth ?? true
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
    const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' }

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
      body: isFormData ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
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
    getCommunityPosts(params: { channel?: CommunityChannel; status?: ReaderStatus; cursor?: string | null } = {}): Promise<CommunityPostsPage> {
      const search = new URLSearchParams()
      if (params.channel) search.set('channel', params.channel)
      if (params.status) search.set('status', params.status)
      if (params.cursor) search.set('cursor', params.cursor)
      const query = search.toString()
      return request<CommunityPostsPage>(`/api/mobile/community/posts${query ? `?${query}` : ''}`)
    },
    getCommunityPost(id: string): Promise<CommunityPostDetailDTO> {
      return request<CommunityPostDetailDTO>(`/api/mobile/community/posts/${id}`)
    },
    getComments(postId: string): Promise<CommentWithAuthorDTO[]> {
      return request<CommentWithAuthorDTO[]>(`/api/mobile/community/posts/${postId}/comments`)
    },
    addComment(postId: string, content: string): Promise<CommentWithAuthorDTO> {
      return request<CommentWithAuthorDTO>(`/api/mobile/community/posts/${postId}/comments`, {
        method: 'POST',
        body: { content },
      })
    },
    getOffers(postId: string): Promise<OffersResult> {
      return request<OffersResult>(`/api/mobile/community/posts/${postId}/offers`)
    },
    getTapes(): Promise<TapeItemDTO[]> {
      return request<TapeItemDTO[]>('/api/mobile/community/tapes')
    },
    getTapeVideoUrl(tapeId: string): Promise<{ url: string }> {
      return request<{ url: string }>(`/api/mobile/community/tapes/${tapeId}/video`)
    },
    createWorkshop(input: {
      title?: string
      scriptSlug?: string | null
      members?: { userId: string; type: 'actor' | 'viewer'; part: string }[]
    }): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>('/api/mobile/workshops', { method: 'POST', body: input })
    },
    updateWorkshop(
      id: string,
      input: { title?: string; scriptSlug?: string | null; members?: { userId: string; type: 'actor' | 'viewer'; part: string }[] }
    ): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>(`/api/mobile/workshops/${id}`, { method: 'PATCH', body: input })
    },
    addWorkshopMember(
      workshopId: string,
      input: { email: string; type?: 'actor' | 'viewer'; part?: string }
    ): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>(`/api/mobile/workshops/${workshopId}/members`, { method: 'POST', body: input })
    },
    removeWorkshopMember(workshopId: string, memberId: string): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>(`/api/mobile/workshops/${workshopId}/members/${memberId}`, { method: 'DELETE' })
    },
    updateWorkshopMember(
      workshopId: string,
      memberId: string,
      input: { type: 'actor' | 'viewer'; part?: string }
    ): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>(`/api/mobile/workshops/${workshopId}/members/${memberId}`, {
        method: 'PATCH',
        body: input,
      })
    },
    setWorkshopRehearsal(
      workshopId: string,
      input: { rehearsalAt: string | null; location?: 'studio' | 'online'; syncCalendar?: boolean }
    ): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>(`/api/mobile/workshops/${workshopId}/rehearsal`, { method: 'PUT', body: input })
    },
    cancelWorkshopRehearsal(workshopId: string): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>(`/api/mobile/workshops/${workshopId}/rehearsal`, { method: 'DELETE' })
    },
    leaveWorkshop(workshopId: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/mobile/workshops/${workshopId}/leave`, { method: 'POST' })
    },
    listScripts(): Promise<ScriptSummary[]> {
      return request<ScriptSummary[]>('/api/mobile/scripts')
    },
    listActiveUsers(): Promise<AddableUser[]> {
      return request<AddableUser[]>('/api/mobile/users/active')
    },
    createCommunityPost(input: {
      channel: CommunityChannel
      title: string
      content: string
      rehearsalAt?: string
      rehearsalFormat?: RehearsalFormat
      sceneDetails?: string
      castingType?: CastingType
      deadlineAt?: string
      attachments?: { uri: string; name: string; type: string }[]
    }): Promise<CommunityPostDetailDTO> {
      const formData = new FormData()
      formData.append('channel', input.channel)
      formData.append('title', input.title)
      formData.append('content', input.content)
      if (input.rehearsalAt) formData.append('rehearsalAt', input.rehearsalAt)
      if (input.rehearsalFormat) formData.append('rehearsalFormat', input.rehearsalFormat)
      if (input.sceneDetails) formData.append('sceneDetails', input.sceneDetails)
      if (input.castingType) formData.append('castingType', input.castingType)
      if (input.deadlineAt) formData.append('deadlineAt', input.deadlineAt)
      for (const attachment of input.attachments ?? []) {
        formData.append('attachments', { uri: attachment.uri, name: attachment.name, type: attachment.type } as unknown as Blob)
      }
      return request<CommunityPostDetailDTO>('/api/mobile/community/posts', { method: 'POST', body: formData })
    },
    updateReaderStatus(postId: string, status: ReaderStatus): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/mobile/community/posts/${postId}/reader-status`, {
        method: 'PATCH',
        body: { status },
      })
    },
    offerToRead(postId: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/mobile/community/posts/${postId}/offers`, { method: 'POST' })
    },
    confirmReader(postId: string, userId: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/mobile/community/posts/${postId}/confirm-reader`, {
        method: 'POST',
        body: { userId },
      })
    },
    deleteCommunityPost(postId: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/mobile/community/posts/${postId}`, { method: 'DELETE' })
    },
    requestTapeUploadToken(filename: string): Promise<{ token: string; pathname: string }> {
      return request<{ token: string; pathname: string }>('/api/mobile/community/tapes/upload-token', {
        method: 'POST',
        body: { filename },
      })
    },
    createTape(input: {
      title: string
      description: string
      videoPathname: string
      durationSeconds: number | null
    }): Promise<TapeItemDTO> {
      return request<TapeItemDTO>('/api/mobile/community/tapes', { method: 'POST', body: input })
    },
    listTapeNotes(tapeId: string): Promise<TapeNoteItemDTO[]> {
      return request<TapeNoteItemDTO[]>(`/api/mobile/community/tapes/${tapeId}/notes`)
    },
    addTapeNote(
      tapeId: string,
      input: { timestampSeconds: number; content: string; tag: TapeNoteTag | null }
    ): Promise<TapeNoteItemDTO> {
      return request<TapeNoteItemDTO>(`/api/mobile/community/tapes/${tapeId}/notes`, { method: 'POST', body: input })
    },
    deleteTape(tapeId: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/mobile/community/tapes/${tapeId}`, { method: 'DELETE' })
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
