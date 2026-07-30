import { describe, expect, it } from 'vitest'
import {
  buildOrderMutation,
  normalizeOrdersPayload,
  serializeOrderFilters,
} from './model'

const orderId = '00000000-0000-0000-0000-000000000001'

describe('serializeOrderFilters', () => {
  it('maps the cancelled UI filter to order status', () => {
    expect(serializeOrderFilters({
      page: 2,
      typeFilter: 'first_box',
      statusFilter: 'cancelled',
      search: '  harsha  ',
    })).toEqual({
      page: 2,
      page_size: 25,
      order_type: 'first_box',
      status: 'cancelled',
      dispatch_status: null,
      search: 'harsha',
    })
  })

  it('maps dispatch filters independently from order status', () => {
    expect(serializeOrderFilters({
      page: 0,
      typeFilter: '',
      statusFilter: 'pending',
      search: '',
    })).toEqual({
      page: 0,
      page_size: 25,
      order_type: null,
      status: null,
      dispatch_status: 'pending',
      search: '',
    })
  })
})

describe('normalizeOrdersPayload', () => {
  it('uses server-flattened customer and current address data', () => {
    const payload = {
      rows: [{
        id: orderId,
        status: 'paid',
        dispatch_status: 'pending',
        customer: {
          id: '10000000-0000-0000-0000-000000000001',
          first_name: 'Harsha',
          last_name: 'Dandi',
          email: 'harsha@bysolum.com',
        },
        address: {
          name: 'Harsha Dandi',
          line1: '1 Test Street',
          line2: null,
          city: 'London',
          postcode: 'SW1A 1AA',
          phone: null,
        },
      }],
      total_count: 26,
      dispatch_batches: [{
        date: '2026-07-31',
        total: 1,
        codes: { GS: 1 },
      }],
    }

    expect(normalizeOrdersPayload(payload)).toEqual(payload)
  })

  it('rejects rows that still require a browser customer query', () => {
    expect(() => normalizeOrdersPayload({
      rows: [{
        id: orderId,
        status: 'paid',
        dispatch_status: 'pending',
        customer_id: '10000000-0000-0000-0000-000000000001',
      }],
      total_count: 1,
      dispatch_batches: [],
    })).toThrow(/customer/i)
  })
})

describe('buildOrderMutation', () => {
  it('trims dispatch details and binds them to the confirmed order', () => {
    expect(buildOrderMutation('dispatch', orderId, {
      carrier: 'royal-mail',
      tracking: ' TRACK123 ',
    })).toEqual({
      action: 'dispatch',
      order_id: orderId,
      carrier: 'royal-mail',
      tracking_number: 'TRACK123',
    })
  })

  it('builds delivered and reset mutations without stale tracking input', () => {
    expect(buildOrderMutation('deliver', orderId, {
      carrier: 'evri',
      tracking: 'STALE',
    })).toEqual({
      action: 'deliver',
      order_id: orderId,
    })
    expect(buildOrderMutation('reset_pending', orderId, {})).toEqual({
      action: 'reset_pending',
      order_id: orderId,
    })
  })
})
