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

    const body = await req.json()
    const { supplier_name, product_id, quantity, unit_cost_pence, order_date, expected_delivery_date, notes } = body

    if (!supplier_name || !product_id || !quantity || quantity <= 0) {
      return new Response(JSON.stringify({ error: 'supplier_name, product_id, and quantity are required' }), {
        status: 400, headers: corsHeaders,
      })
    }

    const { data, error } = await db
      .from('supplier_orders')
      .insert({
        supplier_name,
        product_id,
        quantity,
        unit_cost_pence: unit_cost_pence ?? 0,
        order_date: order_date ?? new Date().toISOString().split('T')[0],
        expected_delivery_date: expected_delivery_date ?? null,
        status: 'pending',
        notes: notes ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, order: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
