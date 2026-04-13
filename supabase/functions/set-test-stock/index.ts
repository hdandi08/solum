/**
 * One-off: set product stock to 100 for testing.
 * POST with { "secret": "test-stock" } to run.
 * Delete this function when testing is done.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { secret, stock, reset } = await req.json().catch(() => ({}))
  if (secret !== 'test-stock') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const qty = reset ? 0 : (stock ?? 100)

  // Update all active products + packaging
  const { data, error } = await db
    .from('products')
    .update({ current_stock: qty })
    .in('id', [
      'product-01','product-02','product-03','product-04',
      'product-05','product-06','product-07','product-08',
      'box-first-kit','box-monthly-refill',
    ])
    .select('id, current_stock')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ updated: data?.length, stock: qty, products: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
