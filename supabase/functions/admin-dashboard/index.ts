import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_EMAILS = ['harsha@pricedab.com', 'harsha@bysolum.com']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Auth — verify caller is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user || !ADMIN_EMAILS.includes(user.email!)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    // Service role client for all data access
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Active subscriber counts by kit
    const { data: subCounts } = await db
      .from('subscriptions')
      .select('kit_id')
      .eq('status', 'active')

    const subscribersByKit: Record<string, number> = { ground: 0, ritual: 0, sovereign: 0 }
    for (const s of subCounts ?? []) {
      if (s.kit_id in subscribersByKit) subscribersByKit[s.kit_id]++
    }
    const totalSubscribers = Object.values(subscribersByKit).reduce((a, b) => a + b, 0)

    // 2. Kit composition + shipment cycle per product
    const { data: kitProducts } = await db
      .from('kit_products')
      .select('kit_id, product_id, refill_qty, products(shipment_cycle_days)')

    // 3. Monthly burn — adjusted for shipment frequency
    // e.g. back scrub (90-day cycle) = 0.33 units/sub/month; scalp massager (365-day) = 0.082/sub/month
    const monthlyBurn: Record<string, number> = {}
    for (const kp of kitProducts ?? []) {
      if (kp.refill_qty === 0) continue
      if (!monthlyBurn[kp.product_id]) monthlyBurn[kp.product_id] = 0
      const cycleDays = (kp.products as any)?.shipment_cycle_days || 30
      const unitsPerSubPerMonth = kp.refill_qty * (30 / cycleDays)
      monthlyBurn[kp.product_id] += unitsPerSubPerMonth * (subscribersByKit[kp.kit_id] ?? 0)
    }

    // 4. All products with calculated runway
    const { data: products } = await db
      .from('products')
      .select('*')
      .order('id')

    const productsWithMetrics = (products ?? []).map((p) => {
      const burn = monthlyBurn[p.id] ?? 0
      const daysRunway = burn > 0 ? (p.current_stock / burn) * 30 : null
      const weeksRunway = daysRunway != null ? daysRunway / 7 : null
      // restock_lead_days = how long it takes to get new stock from supplier
      // If runway < restock_lead_days, we need to reorder now
      const restockDays = p.restock_lead_days ?? 60

      let riskLevel: string
      if (p.current_stock === 0) {
        riskLevel = 'out_of_stock'
      } else if (daysRunway === null) {
        riskLevel = 'no_data'
      } else if (daysRunway < restockDays / 2) {
        riskLevel = 'critical'
      } else if (daysRunway < restockDays) {
        riskLevel = 'low'
      } else {
        riskLevel = 'ok'
      }

      return {
        ...p,
        monthly_burn: burn,
        days_runway: daysRunway ? Math.round(daysRunway) : null,
        weeks_runway: weeksRunway ? Math.round(weeksRunway * 10) / 10 : null,
        risk_level: riskLevel,
      }
    })

    // 5. Pending supplier orders
    const { data: pendingOrders } = await db
      .from('supplier_orders')
      .select('*, products(name, sku)')
      .in('status', ['pending', 'in_transit'])
      .order('expected_delivery_date', { ascending: true })

    // 6. Recent inventory transactions (last 10)
    const { data: recentTransactions } = await db
      .from('inventory_transactions')
      .select('*, products(name, sku)')
      .order('created_at', { ascending: false })
      .limit(10)

    // 7. Products at risk count
    const atRisk = productsWithMetrics.filter(
      (p) => p.is_active && ['critical', 'out_of_stock', 'low'].includes(p.risk_level)
    ).length

    return new Response(JSON.stringify({
      subscribers: { by_kit: subscribersByKit, total: totalSubscribers },
      products: productsWithMetrics,
      pending_orders: pendingOrders ?? [],
      recent_transactions: recentTransactions ?? [],
      summary: {
        total_products: (products ?? []).filter((p) => p.is_active).length,
        products_at_risk: atRisk,
        pending_deliveries: (pendingOrders ?? []).length,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
