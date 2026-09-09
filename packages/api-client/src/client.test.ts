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
