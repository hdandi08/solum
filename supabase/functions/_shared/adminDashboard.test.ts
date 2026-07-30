import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { buildAdminDashboard } from './adminDashboard.ts'

Deno.test('buildAdminDashboard returns the canonical summary and product metrics', () => {
  const result = buildAdminDashboard({
    subscriptions: [
      { kit_id: 'ground' },
      { kit_id: 'ground' },
      { kit_id: 'ritual' },
    ],
    kitProducts: [
      {
        kit_id: 'ground',
        product_id: 'product-01',
        refill_qty: 1,
        shipment_cycle_days: 30,
      },
      {
        kit_id: 'ritual',
        product_id: 'product-01',
        refill_qty: 1,
        shipment_cycle_days: 30,
      },
      {
        kit_id: 'ground',
        product_id: 'product-02',
        refill_qty: 1,
        shipment_cycle_days: 30,
      },
    ],
    products: [
      {
        id: 'product-01',
        name: 'Body Wash',
        current_stock: 30,
        is_active: true,
        restock_lead_days: 60,
      },
      {
        id: 'product-02',
        name: 'Exfoliating Mitt',
        current_stock: 0,
        is_active: true,
        restock_lead_days: 60,
      },
      {
        id: 'product-03',
        name: 'Unused Product',
        current_stock: 10,
        is_active: false,
        restock_lead_days: 60,
      },
    ],
    pendingOrderCount: 2,
    unresolvedPaymentIssueCount: 1,
    recentOrders: [{ id: 'order-1' }],
    recentInventoryEvents: [{
      id: 'event-1',
      product_id: 'product-01',
      product_name: 'Body Wash',
    }],
  })

  assertEquals(result.summary, {
    active_subscribers: 3,
    pending_orders: 2,
    unresolved_payment_issues: 1,
    products_at_risk: 1,
  })
  assertEquals(result.subscribers_by_kit, {
    ground: 2,
    ritual: 1,
    sovereign: 0,
  })
  assertEquals(result.products[0], {
    id: 'product-01',
    name: 'Body Wash',
    current_stock: 30,
    is_active: true,
    restock_lead_days: 60,
    monthly_burn: 3,
    days_runway: 300,
    weeks_runway: 42.9,
    risk_level: 'ok',
  })
  assertEquals(result.products[1].days_runway, 0)
  assertEquals(result.products[1].weeks_runway, 0)
  assertEquals(result.products[1].risk_level, 'out_of_stock')
  assertEquals(result.recent_orders, [{ id: 'order-1' }])
  assertEquals(result.recent_inventory_events[0].product_name, 'Body Wash')
})

Deno.test('buildAdminDashboard uses null runway when there is no demand', () => {
  const result = buildAdminDashboard({
    subscriptions: [],
    kitProducts: [],
    products: [{
      id: 'product-01',
      name: 'Body Wash',
      current_stock: 30,
      is_active: true,
      restock_lead_days: 60,
    }],
    pendingOrderCount: 0,
    unresolvedPaymentIssueCount: 0,
    recentOrders: [],
    recentInventoryEvents: [],
  })

  assertEquals(result.products[0].monthly_burn, 0)
  assertEquals(result.products[0].days_runway, null)
  assertEquals(result.products[0].weeks_runway, null)
  assertEquals(result.products[0].risk_level, 'no_data')
})
