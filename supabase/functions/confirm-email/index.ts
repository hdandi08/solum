import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const token = url.searchParams.get('token') || (await req.json().catch(() => ({}))).token

  if (!token) return json({ error: 'Missing token.' }, 400)

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: lead, error } = await db
    .from('leads')
    .select('id, email, first_name, confirmed_at, checkout_status')
    .eq('confirm_token', token)
    .eq('checkout_status', 'waitlist')
    .maybeSingle()

  if (error) return json({ error: 'Something went wrong.' }, 500)
  if (!lead) return json({ status: 'invalid' }, 404)
  if (lead.confirmed_at) return json({ status: 'already_confirmed', email: lead.email })

  await db
    .from('leads')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('id', lead.id)

  // Determine position in waitlist to know if founding member
  const { count } = await db
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('checkout_status', 'waitlist')
    .lte('created_at', lead.created_at)

  const position  = count ?? 999
  const is_founder = position <= 100

  return json({ status: 'confirmed', email: lead.email, first_name: lead.first_name, position, is_founder })
})
