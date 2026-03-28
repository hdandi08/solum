import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Public endpoint — called by checkout page to check kit availability
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get all first-box kit compositions and current stock
    const { data: kitProducts } = await db
      .from('kit_products')
      .select('kit_id, product_id, first_box_qty, products(current_stock, is_active)')

    // A kit is available if ALL its products have enough stock for at least 1 first box
    const kitAvailability: Record<string, boolean> = {}
    const kitsByKit: Record<string, typeof kitProducts> = {}

    for (const kp of kitProducts ?? []) {
      if (!kitsByKit[kp.kit_id]) kitsByKit[kp.kit_id] = []
      kitsByKit[kp.kit_id].push(kp)
    }

    for (const [kitId, items] of Object.entries(kitsByKit)) {
      kitAvailability[kitId] = items.every(
        (item: any) =>
          item.products?.is_active &&
          item.products?.current_stock >= item.first_box_qty
      )
    }

    // Also expose per-product stock for "selling out soon" signals
    const { data: products } = await db
      .from('products')
      .select('id, current_stock, is_active')

    const productStock: Record<string, number> = {}
    for (const p of products ?? []) {
      productStock[p.id] = p.current_stock
    }

    return new Response(JSON.stringify({
      kits: kitAvailability,
      products: productStock,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
