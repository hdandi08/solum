import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  eventDateBounds,
  parseEventListInput,
} from './adminEvents.ts'

Deno.test('parseEventListInput accepts and normalizes event filters', () => {
  assertEquals(
    parseEventListInput({
      product_id: 'product-01',
      transaction_type: 'outbound_order',
      date_from: '2026-07-01',
      date_to: '2026-07-30',
      page: 2,
      page_size: 50,
    }),
    {
      productId: 'product-01',
      transactionType: 'outbound_order',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-30',
      page: 2,
      pageSize: 50,
    },
  )
})

Deno.test('parseEventListInput supplies bounded empty defaults', () => {
  assertEquals(parseEventListInput({}), {
    productId: null,
    transactionType: null,
    dateFrom: null,
    dateTo: null,
    page: 0,
    pageSize: 25,
  })
})

Deno.test('parseEventListInput accepts only known inventory event types', () => {
  for (
    const transactionType of [
      'inbound',
      'outbound_order',
      'adjustment',
      'damaged',
    ]
  ) {
    assertEquals(
      parseEventListInput({ transaction_type: transactionType })
        .transactionType,
      transactionType,
    )
  }

  assertThrows(
    () => parseEventListInput({ transaction_type: 'refund' }),
    TypeError,
    'transaction_type',
  )
})

Deno.test('parseEventListInput rejects malformed products and pagination', () => {
  for (
    const input of [
      { product_id: '../orders' },
      { product_id: 'product_01' },
      { page: -1 },
      { page: 1.5 },
      { page_size: 0 },
      { page_size: 101 },
    ]
  ) {
    assertThrows(() => parseEventListInput(input), TypeError)
  }
})

Deno.test('parseEventListInput rejects invalid or reversed ISO dates', () => {
  for (
    const input of [
      { date_from: '30-07-2026' },
      { date_to: '2026-02-31' },
      { date_from: '2026-08-01', date_to: '2026-07-30' },
    ]
  ) {
    assertThrows(() => parseEventListInput(input), TypeError, 'date')
  }
})

Deno.test('eventDateBounds creates an exclusive UTC upper bound', () => {
  assertEquals(eventDateBounds('2026-07-01', '2026-07-31'), {
    fromInclusive: '2026-07-01T00:00:00.000Z',
    toExclusive: '2026-08-01T00:00:00.000Z',
  })
})
