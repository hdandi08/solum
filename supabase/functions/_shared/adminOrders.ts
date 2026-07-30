const ORDER_TYPES = new Set(['first_box', 'refill'])
const ORDER_STATUSES = new Set(['paid', 'cancelled'])
const DISPATCH_STATUSES = new Set(['pending', 'dispatched', 'delivered'])
const ACTIONS = new Set(['dispatch', 'deliver', 'reset_pending'])
const CARRIERS = new Set([
  'royal-mail',
  'evri',
  'dpd',
  'dhl',
  'parcelforce',
  'other',
])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type OrderAction = 'dispatch' | 'deliver' | 'reset_pending'
export type DispatchStatus = 'pending' | 'dispatched' | 'delivered'

export class OrderConflictError extends Error {
  readonly code = 'INVALID_TRANSITION'

  constructor(message: string) {
    super(message)
    this.name = 'OrderConflictError'
  }
}

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Order request must be an object.')
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
    throw new TypeError('Order pagination is invalid.')
  }
  return parsed
}

function optionalEnum(
  value: unknown,
  allowed: Set<string>,
  field: string,
): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw new TypeError(`${field} is invalid.`)
  }
  return value
}

export function parseOrderListInput(input: unknown) {
  const value = record(input)
  const search = value.search === undefined || value.search === null
    ? ''
    : String(value.search).trim()
  if (search.length > 100) throw new TypeError('Order search is too long.')

  return {
    page: integer(value.page, 0, 0),
    pageSize: integer(value.page_size, 25, 1, 100),
    orderType: optionalEnum(value.order_type, ORDER_TYPES, 'order_type'),
    status: optionalEnum(value.status, ORDER_STATUSES, 'status'),
    dispatchStatus: optionalEnum(
      value.dispatch_status,
      DISPATCH_STATUSES,
      'dispatch_status',
    ),
    search,
  }
}

export function parseOrderMutation(input: unknown) {
  const value = record(input)
  if (typeof value.action !== 'string' || !ACTIONS.has(value.action)) {
    throw new TypeError('Order action is invalid.')
  }
  if (typeof value.order_id !== 'string' || !UUID.test(value.order_id)) {
    throw new TypeError('order_id must be a UUID.')
  }

  const action = value.action as OrderAction
  if (action !== 'dispatch') {
    return {
      action,
      orderId: value.order_id,
      carrier: null,
      trackingNumber: null,
    }
  }

  if (typeof value.carrier !== 'string' || !CARRIERS.has(value.carrier)) {
    throw new TypeError('carrier is invalid.')
  }
  const trackingNumber = typeof value.tracking_number === 'string'
    ? value.tracking_number.trim()
    : ''
  if (!trackingNumber || trackingNumber.length > 100) {
    throw new TypeError('tracking_number must be 1 to 100 characters.')
  }

  return {
    action,
    orderId: value.order_id,
    carrier: value.carrier,
    trackingNumber,
  }
}

export function nextDispatchState(
  current: string,
  action: OrderAction,
): DispatchStatus {
  if (current === 'pending' && action === 'dispatch') return 'dispatched'
  if (current === 'dispatched' && action === 'deliver') return 'delivered'
  if (current === 'dispatched' && action === 'reset_pending') return 'pending'

  throw new OrderConflictError(
    `Cannot ${action} an order with dispatch status ${current}.`,
  )
}

export function escapePostgrestLike(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
}

export type PendingDispatchOrder = {
  kit_id: string | null
  order_type: string
  box_number: number | null
  created_at: string
}

function boxCode(order: PendingDispatchOrder): string {
  const kit = order.kit_id === 'ritual' ? 'R' : 'G'
  if (order.order_type === 'first_box') return `${kit}S`
  if (order.box_number === 3) return `${kit}R3`
  if (order.box_number === 6) return `${kit}R6`
  return `${kit}R`
}

function dispatchDate(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('Pending order created_at is invalid.')
  }

  const day = date.getUTCDay()
  const beforeNoon = date.getUTCHours() < 12
  const daysToAdd: Record<number, number> = {
    1: 3,
    2: 2,
    4: 4,
    5: 3,
    6: 2,
  }
  const add = day === 3
    ? beforeNoon ? 1 : 5
    : day === 0
    ? beforeNoon ? 1 : 4
    : daysToAdd[day]

  date.setUTCDate(date.getUTCDate() + add)
  return date.toISOString().slice(0, 10)
}

export function buildDispatchBatches(orders: PendingDispatchOrder[]) {
  const batches = new Map<
    string,
    { date: string; total: number; codes: Record<string, number> }
  >()

  for (const order of orders) {
    const date = dispatchDate(order.created_at)
    const code = boxCode(order)
    const batch = batches.get(date) ?? {
      date,
      total: 0,
      codes: {},
    }
    batch.total += 1
    batch.codes[code] = (batch.codes[code] ?? 0) + 1
    batches.set(date, batch)
  }

  return [...batches.values()].sort((a, b) => a.date.localeCompare(b.date))
}
