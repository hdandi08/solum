import { describe, expect, it } from 'vitest'
import { AdminApiError, createAdminApi } from './adminApi'

const environment = {
  supabaseUrl: 'https://rodvvmfzkyjsqbufkjbc.supabase.co',
  anonKey: 'public-anon-key',
}

function supabaseWithSession(accessToken = 'session-token') {
  return {
    auth: {
      getSession: async () => ({
        data: {
          session: accessToken ? { access_token: accessToken } : null,
        },
      }),
    },
  }
}

describe('createAdminApi', () => {
  it('adds the current session and unwraps the canonical envelope', async () => {
    const calls = []
    const api = createAdminApi({
      supabase: supabaseWithSession(),
      environment,
      fetchImpl: async (url, options) => {
        calls.push({ url, options })
        return new Response(JSON.stringify({
          data: { count: 2 },
          request_id: '10000000-0000-0000-0000-000000000001',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    })

    const result = await api.request('admin-dashboard', {
      body: { refresh: true },
    })

    expect(result).toEqual({ count: 2 })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(
      'https://rodvvmfzkyjsqbufkjbc.supabase.co/functions/v1/admin-dashboard',
    )
    expect(calls[0].options).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer session-token',
        apikey: 'public-anon-key',
      },
      body: '{"refresh":true}',
    })
  })

  it('does not make a request without a session', async () => {
    let called = false
    const api = createAdminApi({
      supabase: supabaseWithSession(''),
      environment,
      fetchImpl: async () => {
        called = true
        return new Response()
      },
    })

    await expect(api.request('admin-dashboard')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    })
    expect(called).toBe(false)
  })

  it('rejects function names that could escape the Edge Function path', async () => {
    let called = false
    const api = createAdminApi({
      supabase: supabaseWithSession(),
      environment,
      fetchImpl: async () => {
        called = true
        return new Response()
      },
    })

    await expect(api.request('../customer-endpoint')).rejects.toMatchObject({
      code: 'INVALID_FUNCTION',
      status: 400,
    })
    expect(called).toBe(false)
  })

  it.each([
    [401, 'UNAUTHORIZED', 'Sign in is required.'],
    [403, 'MFA_REQUIRED', 'Administrator MFA is required.'],
    [403, 'FORBIDDEN', 'Administrator access is required.'],
    [400, 'VALIDATION_FAILED', 'Page size is invalid.'],
    [500, 'INTERNAL_ERROR', 'Admin request failed.'],
  ])('maps HTTP %s and %s to AdminApiError', async (status, code, message) => {
    const api = createAdminApi({
      supabase: supabaseWithSession(),
      environment,
      fetchImpl: async () =>
        new Response(JSON.stringify({
          error: { code, message },
          request_id: '10000000-0000-0000-0000-000000000001',
        }), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
    })

    const error = await api.request('admin-dashboard').catch((caught) => caught)

    expect(error).toBeInstanceOf(AdminApiError)
    expect(error).toMatchObject({
      code,
      message,
      status,
      requestId: '10000000-0000-0000-0000-000000000001',
    })
  })

  it('fails closed when an endpoint returns a malformed envelope', async () => {
    const api = createAdminApi({
      supabase: supabaseWithSession(),
      environment,
      fetchImpl: async () =>
        new Response('not-json', {
          status: 502,
          headers: { 'Content-Type': 'text/plain' },
        }),
    })

    await expect(api.request('admin-dashboard')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 502,
    })
  })
})
