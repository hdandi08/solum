import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { data: kitInventory, error } = await db
      .from('kit_inventory')
      .select('kit_id, available_count')

    if (error) throw error

    const kits: Record<string, { available: boolean; count: number }> = {}
    for (const row of kitInventory ?? []) {
      kits[row.kit_id] = {
        available: row.available_count > 0,
        count: row.available_count ?? 0,
      }
    }

    return new Response(JSON.stringify({ kits }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
