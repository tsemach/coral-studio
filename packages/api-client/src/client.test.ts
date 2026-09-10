import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApiClient } from './client'
import { ApiError } from './errors'

test('attaches the bearer token to authenticated requests', async () => {
  let capturedHeaders: Record<string, string> | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedHeaders = init?.headers as Record<string, string>
    return { ok: true, status: 200, json: async () => ({ live: true }) } as Response
  }) as typeof fetch

  const client = createApiClient({
    baseUrl: 'https://example.test',
    getToken: async () => 'the-token',
    onUnauthorized: () => {},
  })

  await client.getWorkshopLiveStatus('w1')

  assert.equal(capturedHeaders?.Authorization, 'Bearer the-token')
})

test('throws ApiError and calls onUnauthorized when there is no stored token', async () => {
  let unauthorizedCalled = false
  const client = createApiClient({
    baseUrl: 'https://example.test',
    getToken: async () => null,
    onUnauthorized: () => {
      unauthorizedCalled = true
    },
  })

  await assert.rejects(() => client.getWorkshops(), ApiError)
  assert.equal(unauthorizedCalled, true)
})

test('throws ApiError and calls onUnauthorized on a 401 response', async () => {
  let unauthorizedCalled = false
  globalThis.fetch = (async () => {
    return { ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) } as Response
  }) as typeof fetch

  const client = createApiClient({
    baseUrl: 'https://example.test',
    getToken: async () => 'stale-token',
    onUnauthorized: () => {
      unauthorizedCalled = true
    },
  })

  await assert.rejects(() => client.getWorkshops(), ApiError)
  assert.equal(unauthorizedCalled, true)
})

test('login does not require or send a token', async () => {
  let capturedHeaders: Record<string, string> | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedHeaders = init?.headers as Record<string, string>
    return {
      ok: true,
      status: 200,
      json: async () => ({ token: 'x', user: { id: '1', name: null, email: 'a@b.com', image: null } }),
    } as Response
  }) as typeof fetch

  const client = createApiClient({
    baseUrl: 'https://example.test',
    getToken: async () => {
      throw new Error('should not be called for login')
    },
    onUnauthorized: () => {},
  })

  const result = await client.login('a@b.com', 'secret')

  assert.equal(result.token, 'x')
  assert.equal(capturedHeaders?.Authorization, undefined)
})

test('getCommunityPosts builds the query string from channel/status/cursor', async () => {
  let capturedUrl: string | undefined
  globalThis.fetch = (async (input) => {
    capturedUrl = String(input)
    return { ok: true, status: 200, json: async () => ({ items: [], nextCursor: null }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.getCommunityPosts({ channel: 'reader_sos', status: 'seeking', cursor: 'abc' })

  assert.equal(capturedUrl, 'https://example.test/api/mobile/community/posts?channel=reader_sos&status=seeking&cursor=abc')
})

test('getCommunityPosts omits the query string when called with no params', async () => {
  let capturedUrl: string | undefined
  globalThis.fetch = (async (input) => {
    capturedUrl = String(input)
    return { ok: true, status: 200, json: async () => ({ items: [], nextCursor: null }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.getCommunityPosts()

  assert.equal(capturedUrl, 'https://example.test/api/mobile/community/posts')
})

test('getCommunityPosts passes an opaque cursor string through untouched', async () => {
  let capturedUrl: string | undefined
  globalThis.fetch = (async (input) => {
    capturedUrl = String(input)
    return { ok: true, status: 200, json: async () => ({ items: [], nextCursor: null }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.getCommunityPosts({ cursor: 'some-encoded-cursor-string' })

  assert.ok(capturedUrl?.includes('cursor=some-encoded-cursor-string'))
})

test('addComment POSTs the content as JSON', async () => {
  let capturedBody: string | undefined
  let capturedMethod: string | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedBody = init?.body as string
    capturedMethod = init?.method
    return {
      ok: true,
      status: 201,
      json: async () => ({ id: 'c1', postId: 'p1', authorId: 'u1', authorName: 'A', authorImage: null, authorRole: 'user', content: 'hi', createdAt: '2026-01-01T00:00:00.000Z' }),
    } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  const result = await client.addComment('p1', 'hi')

  assert.equal(capturedMethod, 'POST')
  assert.equal(capturedBody, JSON.stringify({ content: 'hi' }))
  assert.equal(result.id, 'c1')
})

test('createWorkshop POSTs the input as JSON', async () => {
  let capturedMethod: string | undefined
  let capturedBody: string | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedMethod = init?.method
    capturedBody = init?.body as string
    return { ok: true, status: 201, json: async () => ({ id: 'w1', title: 'New workshop', members: [] }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.createWorkshop({ title: 'New workshop' })

  assert.equal(capturedMethod, 'POST')
  assert.equal(capturedBody, JSON.stringify({ title: 'New workshop' }))
})

test('removeWorkshopMember sends a DELETE with no body', async () => {
  let capturedMethod: string | undefined
  let capturedBody: unknown
  globalThis.fetch = (async (_input, init) => {
    capturedMethod = init?.method
    capturedBody = init?.body
    return { ok: true, status: 200, json: async () => ({ id: 'w1', title: 'x', members: [] }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.removeWorkshopMember('w1', 'm1')

  assert.equal(capturedMethod, 'DELETE')
  assert.equal(capturedBody, undefined)
})

test('setWorkshopRehearsal PUTs the input as JSON', async () => {
  let capturedMethod: string | undefined
  let capturedBody: string | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedMethod = init?.method
    capturedBody = init?.body as string
    return { ok: true, status: 200, json: async () => ({ id: 'w1', title: 'x', members: [] }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.setWorkshopRehearsal('w1', { rehearsalAt: '2026-10-01T18:00:00.000Z', location: 'online', syncCalendar: false })

  assert.equal(capturedMethod, 'PUT')
  assert.equal(
    capturedBody,
    JSON.stringify({ rehearsalAt: '2026-10-01T18:00:00.000Z', location: 'online', syncCalendar: false })
  )
})

test('createCommunityPost sends a multipart FormData body with no Content-Type override', async () => {
  let capturedBody: unknown
  let capturedHeaders: Record<string, string> | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedBody = init?.body
    capturedHeaders = init?.headers as Record<string, string>
    return { ok: true, status: 201, json: async () => ({ id: 'p1', channel: 'general', attachments: [] }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.createCommunityPost({ channel: 'general', title: 'Hello', content: 'World' })

  assert.ok(capturedBody instanceof FormData)
  assert.equal(capturedHeaders?.['Content-Type'], undefined)
})

test('offerToRead POSTs with no body', async () => {
  let capturedMethod: string | undefined
  let capturedBody: unknown
  globalThis.fetch = (async (_input, init) => {
    capturedMethod = init?.method
    capturedBody = init?.body
    return { ok: true, status: 201, json: async () => ({ success: true }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.offerToRead('p1')

  assert.equal(capturedMethod, 'POST')
  assert.equal(capturedBody, undefined)
})

test('addTapeNote POSTs the input as JSON', async () => {
  let capturedBody: string | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedBody = init?.body as string
    return { ok: true, status: 201, json: async () => ({ id: 'n1' }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.addTapeNote('t1', { timestampSeconds: 42, content: 'Nice beat here', tag: 'objective_action' })

  assert.equal(capturedBody, JSON.stringify({ timestampSeconds: 42, content: 'Nice beat here', tag: 'objective_action' }))
})
