import { describe, expect, it } from 'vitest'
import { normalizeDashboardPayload } from './model'

function payload() {
  return {
    summary: {
      active_subscribers: 3,
      pending_orders: 2,
      unresolved_payment_issues: 1,
      products_at_risk: 1,
    },
    subscribers_by_kit: {
      ground: 2,
      ritual: 1,
      sovereign: 0,
    },
    products: [{
      id: 'product-01',
      name: 'Body Wash',
      current_stock: 20,
      monthly_burn: 10,
      days_runway: 60,
      weeks_runway: 8.6,
      risk_level: 'ok',
    }],
    recent_orders: [],
    recent_inventory_events: [],
  }
}

describe('normalizeDashboardPayload', () => {
  it('accepts and preserves the canonical dashboard contract', () => {
    expect(normalizeDashboardPayload(payload())).toEqual(payload())
  })

  it('rejects the legacy root summary fields', () => {
    const legacy = {
      ...payload(),
      summary: undefined,
      active_subscribers: 3,
      pending_deliveries: 2,
    }

    expect(() => normalizeDashboardPayload(legacy)).toThrow(/summary/i)
  })

  it('rejects legacy product runway field names', () => {
    const value = payload()
    value.products = [{
      ...value.products[0],
      weeks_runway: undefined,
      runway_weeks: 8.6,
    }]

    expect(() => normalizeDashboardPayload(value)).toThrow(/weeks_runway/i)
  })

  it('uses server-supplied risk instead of recalculating in the browser', () => {
    const value = payload()
    value.products[0].current_stock = 0
    value.products[0].risk_level = 'ok'

    expect(normalizeDashboardPayload(value).products[0].risk_level).toBe('ok')
  })
})
