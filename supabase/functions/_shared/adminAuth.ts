import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const PROD_PROJECT_REF = 'gvfptmjluxpngfjendbi'
const DEV_PROJECT_REF = 'rodvvmfzkyjsqbufkjbc'

const ADMIN_ORIGINS = Object.freeze({
  production: ['https://admin.bysolum.co.uk'],
  development: [
    'https://admin-dev.bysolum.co.uk',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ],
})

export type AdminEnvironment = keyof typeof ADMIN_ORIGINS

export type AdminClaims = {
  sub?: string
  email?: string
  aal?: string
  app_metadata?: { role?: string }
}

export type AdminActor = {
  userId: string
  email: string
}

export type AdminContext = {
  actor: AdminActor
  environment: AdminEnvironment
  requestId: string
  origin: string
  corsHeaders: Record<string, string>
}

type AdminErrorContext = {
  requestId: string
  corsHeaders: Record<string, string>
}

export type AdminAuthDependencies = {
  supabaseUrl: string
  getClaims: (token: string) => Promise<AdminClaims | null>
  randomUUID: () => string
}

export class AdminHttpError extends Error {
  readonly status: number
  readonly code: string
  readonly publicMessage: string
  readonly requestId?: string
  readonly corsHeaders?: Record<string, string>

  constructor(
    status: number,
    code: string,
    publicMessage: string,
    context?: Partial<AdminErrorContext>,
  ) {
    super(publicMessage)
    this.name = 'AdminHttpError'
    this.status = status
    this.code = code
    this.publicMessage = publicMessage
    this.requestId = context?.requestId
    this.corsHeaders = context?.corsHeaders
  }
}

function environmentForSupabaseUrl(supabaseUrl: string): AdminEnvironment {
  let url: URL
  try {
    url = new URL(supabaseUrl)
  } catch {
    throw new AdminHttpError(
      500,
      'ADMIN_CONFIG_INVALID',
      'Admin service configuration is invalid.',
    )
  }

  if (url.hostname === `${PROD_PROJECT_REF}.supabase.co`) return 'production'
  if (url.hostname === `${DEV_PROJECT_REF}.supabase.co`) return 'development'

  throw new AdminHttpError(
    500,
    'ADMIN_CONFIG_INVALID',
    'Admin service configuration is invalid.',
  )
}

function approvedOrigin(
  req: Request,
  environment: AdminEnvironment,
): string | null {
  const origin = req.headers.get('origin')
  if (!origin) return null

  try {
    const parsed = new URL(origin)
    const normalized = parsed.origin
    return ADMIN_ORIGINS[environment].includes(normalized) ? normalized : null
  } catch {
    return null
  }
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization')
  const match = header?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function runtimeDependencies(): AdminAuthDependencies {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const client = createClient(supabaseUrl, anonKey)

  return {
    supabaseUrl,
    getClaims: async (token) => {
      const { data, error } = await client.auth.getClaims(token)
      if (error || !data?.claims) return null
      return data.claims as AdminClaims
    },
    randomUUID: () => crypto.randomUUID(),
  }
}

export async function authorizeAdminRequest(
  req: Request,
  deps: AdminAuthDependencies = runtimeDependencies(),
): Promise<AdminContext> {
  const requestId = deps.randomUUID()
  let environment: AdminEnvironment

  try {
    environment = environmentForSupabaseUrl(deps.supabaseUrl)
  } catch (error) {
    if (error instanceof AdminHttpError) {
      throw new AdminHttpError(
        error.status,
        error.code,
        error.publicMessage,
        { requestId, corsHeaders: {} },
      )
    }
    throw error
  }

  const origin = approvedOrigin(req, environment)
  if (!origin) {
    throw new AdminHttpError(
      403,
      'ORIGIN_FORBIDDEN',
      'Admin request origin is not allowed.',
      { requestId, corsHeaders: {} },
    )
  }

  const responseContext = {
    requestId,
    corsHeaders: corsHeaders(origin),
  }
  const token = bearerToken(req)
  if (!token) {
    throw new AdminHttpError(
      401,
      'UNAUTHORIZED',
      'Sign in is required.',
      responseContext,
    )
  }

  const claims = await deps.getClaims(token)
  if (!claims?.sub || !claims.email) {
    throw new AdminHttpError(
      401,
      'UNAUTHORIZED',
      'Sign in is required.',
      responseContext,
    )
  }
  if (claims.app_metadata?.role !== 'admin') {
    throw new AdminHttpError(
      403,
      'FORBIDDEN',
      'Administrator access is required.',
      responseContext,
    )
  }
  if (claims.aal !== 'aal2') {
    throw new AdminHttpError(
      403,
      'MFA_REQUIRED',
      'Administrator MFA is required.',
      responseContext,
    )
  }

  return {
    actor: {
      userId: claims.sub,
      email: claims.email,
    },
    environment,
    requestId,
    origin,
    corsHeaders: responseContext.corsHeaders,
  }
}

export function handleAdminPreflight(
  req: Request,
  supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '',
): Response | null {
  if (req.method !== 'OPTIONS') return null

  let environment: AdminEnvironment
  try {
    environment = environmentForSupabaseUrl(supabaseUrl)
  } catch {
    return new Response(null, {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const origin = approvedOrigin(req, environment)
  if (!origin) {
    return new Response(null, {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin),
      'Cache-Control': 'no-store',
    },
  })
}

function responseHeaders(cors: Record<string, string> | undefined) {
  return {
    ...(cors ?? {}),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  }
}

export function jsonOk(
  data: unknown,
  context: Pick<AdminContext, 'requestId' | 'corsHeaders'>,
  status = 200,
): Response {
  return new Response(
    JSON.stringify({
      data,
      request_id: context.requestId,
    }),
    {
      status,
      headers: responseHeaders(context.corsHeaders),
    },
  )
}

export function jsonError(
  error: AdminHttpError,
  context?: Partial<Pick<AdminContext, 'requestId' | 'corsHeaders'>>,
): Response {
  const requestId = context?.requestId ?? error.requestId ?? crypto.randomUUID()
  const headers = context?.corsHeaders ?? error.corsHeaders

  return new Response(
    JSON.stringify({
      error: {
        code: error.code,
        message: error.publicMessage,
      },
      request_id: requestId,
    }),
    {
      status: error.status,
      headers: responseHeaders(headers),
    },
  )
}
