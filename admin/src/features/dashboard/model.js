const RISK_LEVELS = new Set([
  'out_of_stock',
  'critical',
  'low',
  'ok',
  'no_data',
])

function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Dashboard ${field} must be an object.`)
  }
  return value
}

function number(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Dashboard ${field} must be a number.`)
  }
}

function nullableNumber(value, field) {
  if (value !== null) number(value, field)
}

export function normalizeDashboardPayload(value) {
  const dashboard = object(value, 'payload')
  const summary = object(dashboard.summary, 'summary')
  const subscribers = object(
    dashboard.subscribers_by_kit,
    'subscribers_by_kit',
  )

  for (
    const field of [
      'active_subscribers',
      'pending_orders',
      'unresolved_payment_issues',
      'products_at_risk',
    ]
  ) {
    number(summary[field], `summary.${field}`)
  }
  for (const kit of ['ground', 'ritual', 'sovereign']) {
    number(subscribers[kit], `subscribers_by_kit.${kit}`)
  }
  for (
    const field of [
      'products',
      'recent_orders',
      'recent_inventory_events',
    ]
  ) {
    if (!Array.isArray(dashboard[field])) {
      throw new TypeError(`Dashboard ${field} must be an array.`)
    }
  }

  for (const product of dashboard.products) {
    if (!product || typeof product !== 'object') {
      throw new TypeError('Dashboard product must be an object.')
    }
    if (typeof product.id !== 'string' || typeof product.name !== 'string') {
      throw new TypeError('Dashboard product identity is invalid.')
    }
    number(product.current_stock, 'product.current_stock')
    number(product.monthly_burn, 'product.monthly_burn')
    nullableNumber(product.days_runway, 'product.days_runway')
    nullableNumber(product.weeks_runway, 'product.weeks_runway')
    if (!RISK_LEVELS.has(product.risk_level)) {
      throw new TypeError('Dashboard product risk_level is invalid.')
    }
  }

  return dashboard
}
