import {
  assertEquals,
  assertRejects,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import type { AuditDatabase } from './adminAudit.ts'
import {
  labelActionKey,
  refundIdempotencyKey,
  runAuditedExternalAction,
} from './adminExternalActions.ts'

const orderId = '00000000-0000-0000-0000-000000000001'
const context = {
  actor: {
    userId: '10000000-0000-0000-0000-000000000001',
    email: 'harsha@bysolum.com',
  },
  environment: 'development' as const,
  requestId: '20000000-0000-0000-0000-000000000001',
}

function auditHarness() {
  const timeline: string[] = []
  const inserts: Array<Record<string, unknown>> = []
  const updates: Array<{ id: string; patch: Record<string, unknown> }> = []
  const database: AuditDatabase = {
    insertAudit: async (row) => {
      timeline.push('audit:pending')
      inserts.push(row)
      return { id: '30000000-0000-0000-0000-000000000001' }
    },
    updateAudit: async (id, patch) => {
      timeline.push(`audit:${patch.status}`)
      updates.push({ id, patch })
    },
  }
  return { database, inserts, timeline, updates }
}

Deno.test('external action keys are stable per order', () => {
  assertEquals(
    refundIdempotencyKey(orderId),
    'solum-admin-refund:00000000-0000-0000-0000-000000000001',
  )
  assertEquals(
    labelActionKey(orderId),
    'solum-admin-label:00000000-0000-0000-0000-000000000001',
  )
})

Deno.test('missing order ID fails before audit or external work', async () => {
  const { database, timeline } = auditHarness()

  await assertRejects(
    () =>
      runAuditedExternalAction({
        orderId: '',
        context,
        auditDatabase: database,
        action: 'order.refund',
        failureCode: 'STRIPE_REFUND_FAILED',
        execute: async () => {
          timeline.push('external')
          return { refundId: 're_should_not_run' }
        },
        summarize: result => ({ refund_id: result.refundId }),
      }),
    TypeError,
    'order_id',
  )
  assertEquals(timeline, [])
})

Deno.test('pending audit exists before the external adapter runs', async () => {
  const { database, timeline, updates } = auditHarness()

  const result = await runAuditedExternalAction({
    orderId,
    context,
    auditDatabase: database,
    action: 'order.shipping_label.create',
    failureCode: 'SENDCLOUD_REQUEST_FAILED',
    execute: async () => {
      timeline.push('external')
      return {
        parcelId: '987654',
        trackingNumber: 'TRACK123',
      }
    },
    summarize: value => ({
      parcel_id: value.parcelId,
      tracking_number: value.trackingNumber,
    }),
  })

  assertEquals(result, {
    parcelId: '987654',
    trackingNumber: 'TRACK123',
  })
  assertEquals(timeline, [
    'audit:pending',
    'external',
    'audit:succeeded',
  ])
  assertEquals(updates[0].patch.after_state, {
    parcel_id: '987654',
    tracking_number: 'TRACK123',
  })
})

Deno.test('external failure records only a stable failure code', async () => {
  const { database, timeline, updates } = auditHarness()

  await assertRejects(
    () =>
      runAuditedExternalAction({
        orderId,
        context,
        auditDatabase: database,
        action: 'order.shipping_label.create',
        failureCode: 'SENDCLOUD_REQUEST_FAILED',
        execute: async () => {
          timeline.push('external')
          throw new Error(
            'Bearer secret-token for 1 Customer Street returned raw response',
          )
        },
        summarize: () => ({ parcel_id: 'never' }),
      }),
    Error,
    'secret-token',
  )

  assertEquals(timeline, [
    'audit:pending',
    'external',
    'audit:failed',
  ])
  assertEquals(updates[0].patch.error_code, 'SENDCLOUD_REQUEST_FAILED')
  assertEquals(updates[0].patch.after_state, null)
  const recorded = JSON.stringify(updates[0].patch)
  assertEquals(recorded.includes('secret-token'), false)
  assertEquals(recorded.includes('Customer Street'), false)
})

Deno.test('external action can classify a database failure separately', async () => {
  const { database, updates } = auditHarness()

  await assertRejects(
    () =>
      runAuditedExternalAction({
        orderId,
        context,
        auditDatabase: database,
        action: 'order.refund',
        failureCode: error =>
          error instanceof Error && error.name === 'OrderUpdateError'
            ? 'ORDER_UPDATE_FAILED'
            : 'STRIPE_REFUND_FAILED',
        execute: async () => {
          const error = new Error('update failed')
          error.name = 'OrderUpdateError'
          throw error
        },
        summarize: () => ({ order_status: 'cancelled' }),
      }),
    Error,
    'update failed',
  )

  assertEquals(updates[0].patch.error_code, 'ORDER_UPDATE_FAILED')
})
