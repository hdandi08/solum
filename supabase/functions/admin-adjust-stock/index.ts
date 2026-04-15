import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_EMAILS = ['harsha@pricedab.com', 'harsha@bysolum.co.uk']

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

    const { product_id, quantity, adjustment_type, notes } = await req.json()
    // adjustment_type: 'adjustment' | 'damaged'
    // quantity: positive or negative integer

    if (!product_id || quantity === undefined || quantity === 0) {
      return new Response(JSON.stringify({ error: 'product_id and quantity are required' }), {
        status: 400, headers: corsHeaders,
      })
    }

    const { data: product } = await db
      .from('products')
      .select('current_stock')
      .eq('id', product_id)
      .single()

    if (!product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404, headers: corsHeaders })
    }

    const newStock = (product.current_stock ?? 0) + quantity
    if (newStock < 0) {
      return new Response(JSON.stringify({ error: `Cannot reduce stock below 0. Current: ${product.current_stock}` }), {
        status: 400, headers: corsHeaders,
      })
    }

    await db.from('products').update({ current_stock: newStock }).eq('id', product_id)

    await db.from('inventory_transactions').insert({
      product_id,
      transaction_type: adjustment_type ?? 'adjustment',
      quantity,
      reference_type: 'manual',
      notes: notes ?? null,
      created_by: user.email!,
    })

    return new Response(JSON.stringify({ success: true, new_stock: newStock }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
