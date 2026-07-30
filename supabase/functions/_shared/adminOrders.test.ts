import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  OrderConflictError,
  buildDispatchBatches,
  escapePostgrestLike,
  nextDispatchState,
  parseOrderListInput,
  parseOrderMutation,
} from './adminOrders.ts'

const orderId = '00000000-0000-0000-0000-000000000001'

Deno.test('parseOrderListInput accepts and normalizes bounded filters', () => {
  assertEquals(parseOrderListInput({
    page: 2,
    page_size: 25,
    order_type: 'first_box',
    status: 'paid',
    dispatch_status: 'pending',
    search: '  Harsha  ',
  }), {
    page: 2,
    pageSize: 25,
    orderType: 'first_box',
    status: 'paid',
    dispatchStatus: 'pending',
    search: 'Harsha',
  })
})

Deno.test('parseOrderListInput supplies safe defaults', () => {
  assertEquals(parseOrderListInput({}), {
    page: 0,
    pageSize: 25,
    orderType: null,
    status: null,
    dispatchStatus: null,
    search: '',
  })
})

Deno.test('parseOrderListInput rejects unsafe pagination and filters', () => {
  for (
    const value of [
      { page: -1 },
      { page: 1.2 },
      { page_size: 0 },
      { page_size: 101 },
      { order_type: 'unknown' },
      { status: 'refunded' },
      { dispatch_status: 'unknown' },
      { search: 'x'.repeat(101) },
    ]
  ) {
    assertThrows(() => parseOrderListInput(value), TypeError)
  }
})

Deno.test('parseOrderMutation accepts normalized dispatch input', () => {
  assertEquals(parseOrderMutation({
    action: 'dispatch',
    order_id: orderId,
    carrier: 'royal-mail',
    tracking_number: ' TRACK123 ',
  }), {
    action: 'dispatch',
    orderId,
    carrier: 'royal-mail',
    trackingNumber: 'TRACK123',
  })
})

Deno.test('parseOrderMutation rejects invalid actions and identifiers', () => {
  for (
    const value of [
      { action: 'delete', order_id: orderId },
      { action: 'deliver', order_id: 'not-a-uuid' },
      { action: 'dispatch', order_id: orderId, carrier: 'unknown', tracking_number: 'X' },
      { action: 'dispatch', order_id: orderId, carrier: 'royal-mail', tracking_number: '' },
      { action: 'dispatch', order_id: orderId, carrier: 'royal-mail', tracking_number: 'x'.repeat(101) },
    ]
  ) {
    assertThrows(() => parseOrderMutation(value), TypeError)
  }
})

Deno.test('nextDispatchState permits only the approved transitions', () => {
  assertEquals(nextDispatchState('pending', 'dispatch'), 'dispatched')
  assertEquals(nextDispatchState('dispatched', 'deliver'), 'delivered')
  assertEquals(nextDispatchState('dispatched', 'reset_pending'), 'pending')

  for (
    const [current, action] of [
      ['pending', 'deliver'],
      ['delivered', 'reset_pending'],
      ['delivered', 'dispatch'],
    ] as const
  ) {
    assertThrows(
      () => nextDispatchState(current, action),
      OrderConflictError,
    )
  }
})

Deno.test('escapePostgrestLike escapes wildcard and separator characters', () => {
  assertEquals(
    escapePostgrestLike(String.raw`50%_off\sale`),
    String.raw`50\%\_off\\sale`,
  )
})

Deno.test('buildDispatchBatches groups pending box codes by dispatch date', () => {
  assertEquals(buildDispatchBatches([
    {
      kit_id: 'ground',
      order_type: 'first_box',
      box_number: null,
      created_at: '2026-07-29T10:00:00.000Z',
    },
    {
      kit_id: 'ritual',
      order_type: 'refill',
      box_number: 3,
      created_at: '2026-07-29T11:00:00.000Z',
    },
  ]), [{
    date: '2026-07-30',
    total: 2,
    codes: {
      GS: 1,
      RR3: 1,
    },
  }])
})
