export interface AuditDatabase {
  insertAudit(row: Record<string, unknown>): Promise<{ id: string }>
  updateAudit(id: string, patch: Record<string, unknown>): Promise<void>
}

export type AuditInput = {
  requestId: string
  actorUserId: string
  actorEmail: string
  environment: 'production' | 'development'
  action: string
  targetType: string
  targetId: string
  beforeState?: Record<string, unknown>
}

export type AuditHandle = {
  id: string
  requestId: string
}

export type AuditOutcome =
  | {
    status: 'succeeded'
    afterState?: Record<string, unknown>
  }
  | {
    status: 'failed'
    errorCode: string
    afterState?: Record<string, unknown>
  }

const SENSITIVE_KEY = /authorization|token|secret|password|api[_-]?key|customer|email|address/i
const STABLE_CODE = /^[A-Z][A-Z0-9_]{0,63}$/

function requiredText(value: string, field: string): string {
  const normalized = value.trim()
  if (!normalized) throw new TypeError(`${field} is required.`)
  if (normalized.length > 256) {
    throw new TypeError(`${field} must be 256 characters or fewer.`)
  }
  return normalized
}

function boundedState(
  state: Record<string, unknown> | undefined,
): Record<string, string | number | boolean | null> | null {
  if (state === undefined) return null

  const entries = Object.entries(state)
  if (entries.length > 20) {
    throw new TypeError('Audit state must contain 20 fields or fewer.')
  }

  const bounded: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of entries) {
    if (!key || key.length > 64) {
      throw new TypeError('Audit state keys must be 1 to 64 characters.')
    }
    if (SENSITIVE_KEY.test(key)) {
      throw new TypeError(`Audit state cannot include sensitive key: ${key}.`)
    }
    if (
      value !== null
      && typeof value !== 'string'
      && typeof value !== 'number'
      && typeof value !== 'boolean'
    ) {
      throw new TypeError(`Audit state value for ${key} must be a scalar.`)
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new TypeError(`Audit state value for ${key} must be finite.`)
    }
    if (typeof value === 'string' && value.length > 256) {
      throw new TypeError(`Audit state value for ${key} is too long.`)
    }
    bounded[key] = value
  }
  return bounded
}

export async function startAdminAudit(
  db: AuditDatabase,
  input: AuditInput,
): Promise<AuditHandle> {
  const environment = input.environment
  if (environment !== 'production' && environment !== 'development') {
    throw new TypeError('Audit environment is invalid.')
  }

  const row = {
    request_id: requiredText(input.requestId, 'requestId'),
    actor_user_id: requiredText(input.actorUserId, 'actorUserId'),
    actor_email: requiredText(input.actorEmail, 'actorEmail'),
    environment,
    action: requiredText(input.action, 'action'),
    target_type: requiredText(input.targetType, 'targetType'),
    target_id: requiredText(input.targetId, 'targetId'),
    status: 'pending',
    before_state: boundedState(input.beforeState),
  }

  const inserted = await db.insertAudit(row)
  return {
    id: inserted.id,
    requestId: input.requestId,
  }
}

export async function finishAdminAudit(
  db: AuditDatabase,
  handle: AuditHandle,
  outcome: AuditOutcome,
): Promise<void> {
  const patch: Record<string, unknown> = {
    status: outcome.status,
    after_state: boundedState(outcome.afterState),
    error_code: null,
    completed_at: new Date().toISOString(),
  }

  if (outcome.status === 'failed') {
    if (!STABLE_CODE.test(outcome.errorCode)) {
      throw new TypeError('Audit error code must be a stable uppercase code.')
    }
    patch.error_code = outcome.errorCode
  }

  await db.updateAudit(handle.id, patch)
}

type SupabaseAuditClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => PromiseLike<{
          data: { id: string } | null
          error: { message: string } | null
        }>
      }
    }
    update: (patch: Record<string, unknown>) => {
      eq: (
        column: string,
        value: string,
      ) => PromiseLike<{ error: { message: string } | null }>
    }
  }
}

export function createSupabaseAuditDatabase(
  client: SupabaseAuditClient,
): AuditDatabase {
  return {
    async insertAudit(row) {
      const { data, error } = await client
        .from('admin_audit_events')
        .insert(row)
        .select('id')
        .single()

      if (error || !data?.id) {
        throw new Error(error?.message ?? 'Admin audit insertion failed.')
      }
      return { id: data.id }
    },

    async updateAudit(id, patch) {
      const { error } = await client
        .from('admin_audit_events')
        .update(patch)
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
  }
}
