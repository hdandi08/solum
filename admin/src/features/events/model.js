const PAGE_SIZE = 25
const TYPES = new Set([
  'inbound',
  'outbound_order',
  'adjustment',
  'damaged',
])

function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Events ${field} must be an object.`)
  }
  return value
}

export function serializeEventFilters({ filters, page }) {
  return {
    product_id: filters.product_id || null,
    transaction_type: filters.type || null,
    date_from: filters.date_from || null,
    date_to: filters.date_to || null,
    page,
    page_size: PAGE_SIZE,
  }
}

export function normalizeEventsPayload(value) {
  const payload = object(value, 'payload')
  if (!Array.isArray(payload.rows)) {
    throw new TypeError('Events rows must be an array.')
  }
  if (
    !Number.isInteger(payload.total_count)
    || payload.total_count < 0
  ) {
    throw new TypeError('Events total_count is invalid.')
  }
  if (!Array.isArray(payload.products)) {
    throw new TypeError('Events products must be an array.')
  }

  for (const row of payload.rows) {
    object(row, 'row')
    if (
      typeof row.id !== 'string'
      || typeof row.product_id !== 'string'
      || typeof row.product_name !== 'string'
      || typeof row.transaction_type !== 'string'
      || !TYPES.has(row.transaction_type)
      || !Number.isInteger(row.quantity)
      || typeof row.created_at !== 'string'
    ) {
      throw new TypeError('Events row is invalid.')
    }
  }

  for (const product of payload.products) {
    object(product, 'product')
    if (
      typeof product.id !== 'string'
      || typeof product.name !== 'string'
    ) {
      throw new TypeError('Events product is invalid.')
    }
  }

  return payload
}

export { PAGE_SIZE }
