const TRANSACTION_TYPES = new Set([
  'inbound',
  'outbound_order',
  'adjustment',
  'damaged',
])
const PRODUCT_ID = /^(?:product-[0-9]{2}|box-[a-z0-9]+(?:-[a-z0-9]+)*)$/
const ISO_DATE = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Event request must be an object.')
  }
  return input as Record<string, unknown>
}

function integer(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum?: number,
): number {
  const parsed = value === undefined ? fallback : value
  if (
    typeof parsed !== 'number'
    || !Number.isInteger(parsed)
    || parsed < minimum
    || (maximum !== undefined && parsed > maximum)
  ) {
    throw new TypeError('Event pagination is invalid.')
  }
  return parsed
}

function optionalDate(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') {
    throw new TypeError(`${field} date is invalid.`)
  }

  const match = value.match(ISO_DATE)
  if (!match) throw new TypeError(`${field} date is invalid.`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new TypeError(`${field} date is invalid.`)
  }
  return value
}

export function parseEventListInput(input: unknown) {
  const value = record(input)
  const productId = value.product_id === undefined
      || value.product_id === null
      || value.product_id === ''
    ? null
    : value.product_id
  if (
    productId !== null
    && (typeof productId !== 'string' || !PRODUCT_ID.test(productId))
  ) {
    throw new TypeError('product_id is invalid.')
  }

  const transactionType = value.transaction_type === undefined
      || value.transaction_type === null
      || value.transaction_type === ''
    ? null
    : value.transaction_type
  if (
    transactionType !== null
    && (
      typeof transactionType !== 'string'
      || !TRANSACTION_TYPES.has(transactionType)
    )
  ) {
    throw new TypeError('transaction_type is invalid.')
  }

  const dateFrom = optionalDate(value.date_from, 'date_from')
  const dateTo = optionalDate(value.date_to, 'date_to')
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new TypeError('date_from date must not be after date_to date.')
  }

  return {
    productId,
    transactionType,
    dateFrom,
    dateTo,
    page: integer(value.page, 0, 0),
    pageSize: integer(value.page_size, 25, 1, 100),
  }
}

export function eventDateBounds(
  dateFrom: string | null,
  dateTo: string | null,
) {
  const upper = dateTo
    ? new Date(`${dateTo}T00:00:00.000Z`)
    : null
  if (upper) upper.setUTCDate(upper.getUTCDate() + 1)

  return {
    fromInclusive: dateFrom ? `${dateFrom}T00:00:00.000Z` : null,
    toExclusive: upper?.toISOString() ?? null,
  }
}
