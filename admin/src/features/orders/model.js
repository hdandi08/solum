const PAGE_SIZE = 25

function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Orders ${field} must be an object.`)
  }
  return value
}

export function serializeOrderFilters({
  page,
  typeFilter,
  statusFilter,
  search,
}) {
  return {
    page,
    page_size: PAGE_SIZE,
    order_type: typeFilter || null,
    status: statusFilter === 'cancelled' ? 'cancelled' : null,
    dispatch_status: statusFilter && statusFilter !== 'cancelled'
      ? statusFilter
      : null,
    search: search.trim(),
  }
}

export function normalizeOrdersPayload(value) {
  const payload = object(value, 'payload')
  if (!Array.isArray(payload.rows)) {
    throw new TypeError('Orders rows must be an array.')
  }
  if (
    typeof payload.total_count !== 'number'
    || !Number.isInteger(payload.total_count)
    || payload.total_count < 0
  ) {
    throw new TypeError('Orders total_count is invalid.')
  }
  if (!Array.isArray(payload.dispatch_batches)) {
    throw new TypeError('Orders dispatch_batches must be an array.')
  }

  for (const row of payload.rows) {
    object(row, 'row')
    if (
      typeof row.id !== 'string'
      || typeof row.status !== 'string'
      || typeof row.dispatch_status !== 'string'
    ) {
      throw new TypeError('Orders row identity or status is invalid.')
    }
    object(row.customer, 'customer')
    if (row.address !== null) object(row.address, 'address')
  }

  for (const batch of payload.dispatch_batches) {
    object(batch, 'dispatch batch')
    object(batch.codes, 'dispatch batch codes')
    if (
      typeof batch.date !== 'string'
      || typeof batch.total !== 'number'
    ) {
      throw new TypeError('Orders dispatch batch is invalid.')
    }
  }

  return payload
}

export function buildOrderMutation(action, orderId, input) {
  if (action === 'dispatch') {
    return {
      action,
      order_id: orderId,
      carrier: input.carrier,
      tracking_number: input.tracking.trim(),
    }
  }
  return {
    action,
    order_id: orderId,
  }
}

export { PAGE_SIZE }
