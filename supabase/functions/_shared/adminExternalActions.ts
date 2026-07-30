import type { AdminContext } from './adminAuth.ts'
import {
  finishAdminAudit,
  startAdminAudit,
  type AuditDatabase,
} from './adminAudit.ts'

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ExternalActionContext = Pick<
  AdminContext,
  'actor' | 'environment' | 'requestId'
>

type AuditedExternalAction<T> = {
  orderId: string
  context: ExternalActionContext
  auditDatabase: AuditDatabase
  action: string
  failureCode: string | ((error: unknown) => string)
  beforeState?: Record<string, unknown>
  execute: () => Promise<T>
  summarize: (result: T) => Record<string, unknown>
}

function requireOrderId(orderId: string): string {
  if (typeof orderId !== 'string' || !UUID.test(orderId)) {
    throw new TypeError('order_id must be a UUID.')
  }
  return orderId
}

export function refundIdempotencyKey(orderId: string): string {
  return `solum-admin-refund:${requireOrderId(orderId)}`
}

export function labelActionKey(orderId: string): string {
  return `solum-admin-label:${requireOrderId(orderId)}`
}

export async function runAuditedExternalAction<T>({
  orderId,
  context,
  auditDatabase,
  action,
  failureCode,
  beforeState,
  execute,
  summarize,
}: AuditedExternalAction<T>): Promise<T> {
  const targetId = requireOrderId(orderId)
  const handle = await startAdminAudit(auditDatabase, {
    requestId: context.requestId,
    actorUserId: context.actor.userId,
    actorEmail: context.actor.email,
    environment: context.environment,
    action,
    targetType: 'order',
    targetId,
    beforeState,
  })

  let result: T
  try {
    result = await execute()
  } catch (error) {
    await finishAdminAudit(auditDatabase, handle, {
      status: 'failed',
      errorCode: typeof failureCode === 'function'
        ? failureCode(error)
        : failureCode,
    })
    throw error
  }

  await finishAdminAudit(auditDatabase, handle, {
    status: 'succeeded',
    afterState: summarize(result),
  })
  return result
}
