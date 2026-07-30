export class AdminApiError extends Error {
  constructor(code, message, status, requestId) {
    super(message)
    this.name = 'AdminApiError'
    this.code = code
    this.status = status
    this.requestId = requestId
  }
}

export function createAdminApi({
  supabase,
  environment,
  fetchImpl = fetch,
}) {
  return {
    async request(
      functionName,
      { method = 'POST', body, signal } = {},
    ) {
      if (!/^[a-z0-9-]+$/.test(functionName)) {
        throw new AdminApiError(
          'INVALID_FUNCTION',
          'Admin function name is invalid.',
          400,
        )
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new AdminApiError(
          'UNAUTHORIZED',
          'Sign in is required.',
          401,
        )
      }

      const response = await fetchImpl(
        `${environment.supabaseUrl}/functions/v1/${functionName}`,
        {
          method,
          signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: environment.anonKey,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        },
      )

      let envelope
      try {
        envelope = await response.json()
      } catch {
        throw new AdminApiError(
          'INVALID_RESPONSE',
          'Admin service returned an invalid response.',
          response.status,
        )
      }

      if (!response.ok) {
        const error = envelope?.error
        if (
          !error
          || typeof error.code !== 'string'
          || typeof error.message !== 'string'
        ) {
          throw new AdminApiError(
            'INVALID_RESPONSE',
            'Admin service returned an invalid response.',
            response.status,
            envelope?.request_id,
          )
        }
        throw new AdminApiError(
          error.code,
          error.message,
          response.status,
          envelope.request_id,
        )
      }

      if (!envelope || !Object.hasOwn(envelope, 'data')) {
        throw new AdminApiError(
          'INVALID_RESPONSE',
          'Admin service returned an invalid response.',
          response.status,
          envelope?.request_id,
        )
      }

      return envelope.data
    },
  }
}
