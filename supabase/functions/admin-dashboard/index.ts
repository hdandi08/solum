import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'
import {
  AdminHttpError,
  authorizeAdminRequest,
  handleAdminPreflight,
  jsonError,
  jsonOk,
  type AdminContext,
} from '../_shared/adminAuth.ts'
import { buildAdminDashboard } from '../_shared/adminDashboard.ts'

function internalError(context?: AdminContext) {
  return new AdminHttpError(
    500,
    'INTERNAL_ERROR',
    'Admin dashboard could not be loaded.',
    context,
  )
}

Deno.serve(async (req) => {
  const preflight = handleAdminPreflight(req)
  if (preflight) return preflight

  let context: AdminContext | undefined

  try {
    context = await authorizeAdminRequest(req)
    if (req.method !== 'POST') {
      throw new AdminHttpError(
        405,
        'METHOD_NOT_ALLOWED',
        'This admin operation requires POST.',
        context,
      )
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const [
      subscriptionsResult,
      kitProductsResult,
      productsResult,
      pendingOrdersResult,
      paymentIssuesResult,
      recentOrdersResult,
      recentEventsResult,
    ] = await Promise.all([
      db
        .from('subscriptions')
        .select('kit_id')
        .eq('status', 'active'),
      db
        .from('kit_products')
        .select('kit_id, product_id, refill_qty, products(shipment_cycle_days)'),
      db
        .from('products')
        .select('id, name, current_stock, is_active, restock_lead_days')
        .order('id'),
      db
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('dispatch_status', 'pending'),
      db
        .from('payment_issues')
        .select('id', { count: 'exact', head: true })
        .eq('resolved', false),
      db
        .from('orders')
        .select(`
          id,
          created_at,
          kit_id,
          order_type,
          amount_pence,
          dispatch_status,
          customers(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(6),
      db
        .from('inventory_transactions')
        .select(`
          id,
          product_id,
          transaction_type,
          quantity,
          reference_type,
          reference_id,
          notes,
          created_at,
          products(name)
        `)
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    const results = [
      subscriptionsResult,
      kitProductsResult,
      productsResult,
      pendingOrdersResult,
      paymentIssuesResult,
      recentOrdersResult,
      recentEventsResult,
    ]
    const failed = results.find((result) => result.error)
    if (failed?.error) throw new Error(failed.error.message)

    const kitProducts = (kitProductsResult.data ?? []).map((row) => {
      const related = row.products as {
        shipment_cycle_days?: number
      } | null
      return {
        kit_id: row.kit_id,
        product_id: row.product_id,
        refill_qty: row.refill_qty,
        shipment_cycle_days: related?.shipment_cycle_days ?? 30,
      }
    })

    const recentInventoryEvents = (recentEventsResult.data ?? []).map((row) => {
      const related = row.products as { name?: string } | null
      const { products: _products, ...event } = row
      return {
        ...event,
        product_name: related?.name ?? row.product_id,
      }
    })

    return jsonOk(
      buildAdminDashboard({
        subscriptions: subscriptionsResult.data ?? [],
        kitProducts,
        products: productsResult.data ?? [],
        pendingOrderCount: pendingOrdersResult.count ?? 0,
        unresolvedPaymentIssueCount: paymentIssuesResult.count ?? 0,
        recentOrders: recentOrdersResult.data ?? [],
        recentInventoryEvents,
      }),
      context,
    )
  } catch (error) {
    if (error instanceof AdminHttpError) return jsonError(error, context)

    console.error('ADMIN_DASHBOARD_ERROR', {
      request_id: context?.requestId,
      message: error instanceof Error ? error.message : String(error),
    })
    return jsonError(internalError(context), context)
  }
})
