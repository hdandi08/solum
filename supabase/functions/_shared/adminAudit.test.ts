import {
  assert,
  assertEquals,
  assertRejects,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  finishAdminAudit,
  startAdminAudit,
  type AuditDatabase,
} from './adminAudit.ts'

function fakeDatabase() {
  const inserts: Array<Record<string, unknown>> = []
  const updates: Array<{ id: string; patch: Record<string, unknown> }> = []

  const database: AuditDatabase = {
    insertAudit: async (row: Record<string, unknown>) => {
      inserts.push(row)
      return { id: '20000000-0000-0000-0000-000000000001' }
    },
    updateAudit: async (id: string, patch: Record<string, unknown>) => {
      updates.push({ id, patch })
    },
  }

  return { database, inserts, updates }
}

const baseInput = {
  requestId: '10000000-0000-0000-0000-000000000001',
  actorUserId: '00000000-0000-0000-0000-000000000001',
  actorEmail: 'harsha@bysolum.com',
  environment: 'development' as const,
  action: 'order.shipping_label.create',
  targetType: 'order',
  targetId: '30000000-0000-0000-0000-000000000001',
  beforeState: {
    order_status: 'paid',
    parcel_id: null,
  },
}

Deno.test('startAdminAudit records a pending bounded event', async () => {
  const { database, inserts } = fakeDatabase()

  const handle = await startAdminAudit(database, baseInput)

  assertEquals(handle, {
    id: '20000000-0000-0000-0000-000000000001',
    requestId: baseInput.requestId,
  })
  assertEquals(inserts, [{
    request_id: baseInput.requestId,
    actor_user_id: baseInput.actorUserId,
    actor_email: baseInput.actorEmail,
    environment: 'development',
    action: baseInput.action,
    target_type: 'order',
    target_id: baseInput.targetId,
    status: 'pending',
    before_state: {
      order_status: 'paid',
      parcel_id: null,
    },
  }])
})

Deno.test('finishAdminAudit completes a successful event once', async () => {
  const { database, updates } = fakeDatabase()
  const handle = await startAdminAudit(database, baseInput)

  await finishAdminAudit(database, handle, {
    status: 'succeeded',
    afterState: {
      parcel_id: '987654',
      tracking_number: 'TRACK123',
    },
  })

  assertEquals(updates.length, 1)
  assertEquals(updates[0].id, handle.id)
  assertEquals(updates[0].patch.status, 'succeeded')
  assertEquals(updates[0].patch.after_state, {
    parcel_id: '987654',
    tracking_number: 'TRACK123',
  })
  assertEquals(updates[0].patch.error_code, null)
  assert(typeof updates[0].patch.completed_at === 'string')
})

Deno.test('failed audits store a stable code without exception details', async () => {
  const { database, updates } = fakeDatabase()
  const handle = await startAdminAudit(database, baseInput)

  await finishAdminAudit(database, handle, {
    status: 'failed',
    errorCode: 'SENDCLOUD_REQUEST_FAILED',
    afterState: {
      external_status: 502,
    },
  })

  assertEquals(updates[0].patch.status, 'failed')
  assertEquals(updates[0].patch.error_code, 'SENDCLOUD_REQUEST_FAILED')
  assertEquals(updates[0].patch.after_state, { external_status: 502 })
  assertEquals('stack' in updates[0].patch, false)
  assertEquals('message' in updates[0].patch, false)
})

Deno.test('audit state rejects nested objects and sensitive keys', async () => {
  const { database } = fakeDatabase()

  await assertRejects(
    () =>
      startAdminAudit(database, {
        ...baseInput,
        beforeState: {
          metadata: { value: 'nested' },
        },
      }),
    TypeError,
    'scalar',
  )

  await assertRejects(
    () =>
      startAdminAudit(database, {
        ...baseInput,
        beforeState: {
          authorization: 'Bearer secret',
        },
      }),
    TypeError,
    'sensitive',
  )
})

Deno.test('audit insertion failure blocks the caller', async () => {
  let updateCalled = false
  const database: AuditDatabase = {
    insertAudit: async () => {
      throw new Error('database unavailable')
    },
    updateAudit: async () => {
      updateCalled = true
    },
  }

  await assertRejects(
    () => startAdminAudit(database, baseInput),
    Error,
    'database unavailable',
  )
  assertEquals(updateCalled, false)
})
