import {
  assertEquals,
  assertRejects,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  AdminHttpError,
  authorizeAdminRequest,
  handleAdminPreflight,
  jsonError,
  jsonOk,
  type AdminAuthDependencies,
} from './adminAuth.ts'

const productionUrl = 'https://gvfptmjluxpngfjendbi.supabase.co'
const developmentUrl = 'https://rodvvmfzkyjsqbufkjbc.supabase.co'
const requestId = '10000000-0000-0000-0000-000000000001'
const userId = '00000000-0000-0000-0000-000000000001'

function request(origin: string | null, token = 'valid-token', method = 'POST') {
  const headers = new Headers()
  if (origin !== null) headers.set('origin', origin)
  if (token) headers.set('authorization', `Bearer ${token}`)
  return new Request('https://edge.test/functions/v1/admin-dashboard', {
    method,
    headers,
  })
}

function dependencies(
  supabaseUrl = productionUrl,
  claims: Record<string, unknown> | null = {
    sub: userId,
    email: 'harsha@bysolum.com',
    aal: 'aal2',
    app_metadata: { role: 'admin' },
  },
): AdminAuthDependencies {
  return {
    supabaseUrl,
    getClaims: async () => claims,
    randomUUID: () => requestId,
  }
}

async function adminError(action: () => Promise<unknown>) {
  return await assertRejects(action, AdminHttpError) as AdminHttpError
}

Deno.test('approved production origin, protected admin role, and aal2 succeed', async () => {
  const context = await authorizeAdminRequest(
    request('https://admin.bysolum.co.uk'),
    dependencies(),
  )

  assertEquals(context.actor, {
    userId,
    email: 'harsha@bysolum.com',
  })
  assertEquals(context.environment, 'production')
  assertEquals(context.requestId, requestId)
  assertEquals(
    context.corsHeaders['Access-Control-Allow-Origin'],
    'https://admin.bysolum.co.uk',
  )
})

Deno.test('development accepts only its custom and local origins', async () => {
  for (
    const origin of [
      'https://admin-dev.bysolum.co.uk',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ]
  ) {
    const context = await authorizeAdminRequest(
      request(origin),
      dependencies(developmentUrl),
    )
    assertEquals(context.environment, 'development')
    assertEquals(context.origin, origin)
  }

  await assertRejects(
    () =>
      authorizeAdminRequest(
        request('https://admin.bysolum.co.uk'),
        dependencies(developmentUrl),
      ),
    AdminHttpError,
    'origin',
  )
})

Deno.test('missing or invalid bearer tokens return unauthorized', async () => {
  const missing = await adminError(
    () =>
      authorizeAdminRequest(
        request('https://admin.bysolum.co.uk', ''),
        dependencies(),
      ),
  )
  assertEquals(missing.status, 401)
  assertEquals(missing.code, 'UNAUTHORIZED')

  const invalid = await adminError(
    () =>
      authorizeAdminRequest(
        request('https://admin.bysolum.co.uk'),
        dependencies(productionUrl, null),
      ),
  )
  assertEquals(invalid.status, 401)
  assertEquals(invalid.code, 'UNAUTHORIZED')
})

Deno.test('authenticated non-admin claims return forbidden', async () => {
  const error = await adminError(
    () =>
      authorizeAdminRequest(
        request('https://admin.bysolum.co.uk'),
        dependencies(productionUrl, {
          sub: userId,
          email: 'customer@example.com',
          aal: 'aal2',
          app_metadata: { role: 'customer' },
        }),
      ),
  )

  assertEquals(error.status, 403)
  assertEquals(error.code, 'FORBIDDEN')
})

Deno.test('admin claims at aal1 require MFA', async () => {
  const error = await adminError(
    () =>
      authorizeAdminRequest(
        request('https://admin.bysolum.co.uk'),
        dependencies(productionUrl, {
          sub: userId,
          email: 'harsha@bysolum.com',
          aal: 'aal1',
          app_metadata: { role: 'admin' },
        }),
      ),
  )

  assertEquals(error.status, 403)
  assertEquals(error.code, 'MFA_REQUIRED')
})

Deno.test('missing, malformed, and unapproved origins fail closed', async () => {
  for (const origin of [null, 'not-an-origin', 'https://evil.example']) {
    const error = await adminError(
      () => authorizeAdminRequest(request(origin), dependencies()),
    )
    assertEquals(error.status, 403)
    assertEquals(error.code, 'ORIGIN_FORBIDDEN')
    assertEquals(
      error.corsHeaders?.['Access-Control-Allow-Origin'],
      undefined,
    )
  }
})

Deno.test('unknown Supabase projects fail closed', async () => {
  const error = await adminError(
    () =>
      authorizeAdminRequest(
        request('https://admin.bysolum.co.uk'),
        dependencies('https://unknown.supabase.co'),
      ),
  )

  assertEquals(error.status, 500)
  assertEquals(error.code, 'ADMIN_CONFIG_INVALID')
})

Deno.test('preflight reflects approved origins and rejects unknown origins', async () => {
  const approved = handleAdminPreflight(
    request('https://admin-dev.bysolum.co.uk', '', 'OPTIONS'),
    developmentUrl,
  )
  assertEquals(approved?.status, 204)
  assertEquals(
    approved?.headers.get('Access-Control-Allow-Origin'),
    'https://admin-dev.bysolum.co.uk',
  )

  const rejected = handleAdminPreflight(
    request('https://evil.example', '', 'OPTIONS'),
    developmentUrl,
  )
  assertEquals(rejected?.status, 403)
  assertEquals(rejected?.headers.get('Access-Control-Allow-Origin'), null)
})

Deno.test('canonical responses preserve the request id and never cache', async () => {
  const context = await authorizeAdminRequest(
    request('https://admin.bysolum.co.uk'),
    dependencies(),
  )
  const success = jsonOk({ count: 2 }, context)

  assertEquals(success.status, 200)
  assertEquals(success.headers.get('Cache-Control'), 'no-store')
  assertEquals(await success.json(), {
    data: { count: 2 },
    request_id: requestId,
  })

  const failure = jsonError(
    new AdminHttpError(
      403,
      'MFA_REQUIRED',
      'Administrator MFA is required.',
      context,
    ),
  )
  assertEquals(failure.status, 403)
  assertEquals(failure.headers.get('Cache-Control'), 'no-store')
  assertEquals(await failure.json(), {
    error: {
      code: 'MFA_REQUIRED',
      message: 'Administrator MFA is required.',
    },
    request_id: requestId,
  })
})
