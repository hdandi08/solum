import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_EMAILS = ['harsha@pricedab.com', 'harsha@bysolum.com']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
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

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { supplier_order_id } = await req.json()
    if (!supplier_order_id) {
      return new Response(JSON.stringify({ error: 'supplier_order_id is required' }), {
        status: 400, headers: corsHeaders,
      })
    }

    // Fetch the order
    const { data: order, error: fetchError } = await db
      .from('supplier_orders')
      .select('*')
      .eq('id', supplier_order_id)
      .single()

    if (fetchError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders })
    }
    if (order.status === 'delivered') {
      return new Response(JSON.stringify({ error: 'Order already marked as delivered' }), {
        status: 400, headers: corsHeaders,
      })
    }

    const today = new Date().toISOString().split('T')[0]

    // Mark order as delivered
    await db
      .from('supplier_orders')
      .update({ status: 'delivered', actual_delivery_date: today })
      .eq('id', supplier_order_id)

    // Update product stock
    const { data: product } = await db
      .from('products')
      .select('current_stock')
      .eq('id', order.product_id)
      .single()

    await db
      .from('products')
      .update({ current_stock: (product?.current_stock ?? 0) + order.quantity })
      .eq('id', order.product_id)

    // Log the transaction
    await db.from('inventory_transactions').insert({
      product_id: order.product_id,
      transaction_type: 'inbound',
      quantity: order.quantity,
      reference_type: 'supplier_delivery',
      reference_id: supplier_order_id,
      notes: `Delivery from ${order.supplier_name}`,
      created_by: user.email!,
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
