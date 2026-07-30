import { describe, expect, it } from 'vitest'
import {
  normalizeEventsPayload,
  serializeEventFilters,
} from './model'

describe('serializeEventFilters', () => {
  it('maps UI filters to the paginated server contract', () => {
    expect(serializeEventFilters({
      filters: {
        product_id: 'product-01',
        type: 'damaged',
        date_from: '2026-07-01',
        date_to: '2026-07-30',
      },
      page: 3,
    })).toEqual({
      product_id: 'product-01',
      transaction_type: 'damaged',
      date_from: '2026-07-01',
      date_to: '2026-07-30',
      page: 3,
      page_size: 25,
    })
  })

  it('serializes empty filters as null without a direct-query fallback', () => {
    expect(serializeEventFilters({
      filters: {
        product_id: '',
        type: '',
        date_from: '',
        date_to: '',
      },
      page: 0,
    })).toEqual({
      product_id: null,
      transaction_type: null,
      date_from: null,
      date_to: null,
      page: 0,
      page_size: 25,
    })
  })
})

describe('normalizeEventsPayload', () => {
  it('accepts rows, total count, and products from one server response', () => {
    const payload = {
      rows: [{
        id: '00000000-0000-0000-0000-000000000001',
        product_id: 'product-01',
        product_name: 'Body Wash',
        transaction_type: 'outbound_order',
        quantity: -1,
        reference_type: 'order',
        reference_id: 'order-123',
        notes: null,
        created_by: 'system',
        created_at: '2026-07-30T12:00:00.000Z',
      }],
      total_count: 1,
      products: [{
        id: 'product-01',
        name: 'Body Wash',
      }],
    }

    expect(normalizeEventsPayload(payload)).toEqual(payload)
  })

  it('rejects partial responses that would require another request', () => {
    expect(() => normalizeEventsPayload({
      rows: [],
      total_count: 0,
    })).toThrow(/products/i)
    expect(() => normalizeEventsPayload({
      rows: [{ id: 'event-only' }],
      total_count: 1,
      products: [],
    })).toThrow(/row/i)
  })
})
