export type DashboardSubscription = {
  kit_id: string | null
}

export type DashboardKitProduct = {
  kit_id: string
  product_id: string
  refill_qty: number
  shipment_cycle_days: number
}

export type DashboardProduct = {
  id: string
  name: string
  current_stock: number
  is_active: boolean
  restock_lead_days: number | null
}

export type DashboardInput = {
  subscriptions: DashboardSubscription[]
  kitProducts: DashboardKitProduct[]
  products: DashboardProduct[]
  pendingOrderCount: number
  unresolvedPaymentIssueCount: number
  recentOrders: Array<Record<string, unknown>>
  recentInventoryEvents: Array<Record<string, unknown>>
}

const KIT_IDS = ['ground', 'ritual', 'sovereign'] as const

function safeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

export function buildAdminDashboard(input: DashboardInput) {
  const subscribersByKit: Record<string, number> = {
    ground: 0,
    ritual: 0,
    sovereign: 0,
  }

  for (const subscription of input.subscriptions) {
    if (
      subscription.kit_id
      && KIT_IDS.includes(subscription.kit_id as typeof KIT_IDS[number])
    ) {
      subscribersByKit[subscription.kit_id] += 1
    }
  }

  const monthlyBurn: Record<string, number> = {}
  for (const kitProduct of input.kitProducts) {
    const subscriberCount = subscribersByKit[kitProduct.kit_id] ?? 0
    if (
      subscriberCount === 0
      || kitProduct.refill_qty <= 0
      || kitProduct.shipment_cycle_days <= 0
    ) {
      continue
    }

    const burn = kitProduct.refill_qty
      * subscriberCount
      * (30 / kitProduct.shipment_cycle_days)
    monthlyBurn[kitProduct.product_id] =
      (monthlyBurn[kitProduct.product_id] ?? 0) + burn
  }

  const products = input.products.map((product) => {
    const burn = monthlyBurn[product.id] ?? 0
    const daysRunway = burn > 0
      ? (product.current_stock / burn) * 30
      : null
    const restockLeadDays = product.restock_lead_days ?? 60

    let riskLevel: 'out_of_stock' | 'critical' | 'low' | 'ok' | 'no_data'
    if (product.current_stock === 0) {
      riskLevel = 'out_of_stock'
    } else if (daysRunway === null) {
      riskLevel = 'no_data'
    } else if (daysRunway < restockLeadDays / 2) {
      riskLevel = 'critical'
    } else if (daysRunway < restockLeadDays) {
      riskLevel = 'low'
    } else {
      riskLevel = 'ok'
    }

    return {
      ...product,
      monthly_burn: oneDecimal(burn),
      days_runway: daysRunway === null ? null : Math.round(daysRunway),
      weeks_runway: daysRunway === null
        ? null
        : oneDecimal(daysRunway / 7),
      risk_level: riskLevel,
    }
  })

  return {
    summary: {
      active_subscribers: input.subscriptions.length,
      pending_orders: safeCount(input.pendingOrderCount),
      unresolved_payment_issues: safeCount(
        input.unresolvedPaymentIssueCount,
      ),
      products_at_risk: products.filter((product) =>
        product.is_active
        && ['out_of_stock', 'critical', 'low'].includes(product.risk_level)
      ).length,
    },
    subscribers_by_kit: subscribersByKit,
    products,
    recent_orders: input.recentOrders,
    recent_inventory_events: input.recentInventoryEvents,
  }
}
