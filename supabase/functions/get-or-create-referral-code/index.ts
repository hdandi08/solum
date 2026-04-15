// get-or-create-referral-code
// Authenticated. Returns the founding member's unique referral code,
// generating one if it doesn't exist yet. Also returns referral count.
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

function generateCode(firstName: string | null): string {
  const name = (firstName ?? 'SOLM')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 5)
    .padEnd(4, 'X')
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let rand = ''
  for (let i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)]
  return `F-${name}-${rand}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authErr } = await anonClient.auth.getUser()
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  // Look up customer
  const { data: customer } = await db
    .from('customers')
    .select('id, first_name, referral_code')
    .eq('supabase_user_id', user.id)
    .eq('is_founding_member', true)
    .maybeSingle()

  if (!customer) return json({ error: 'Not a founding member' }, 403)

  let code = customer.referral_code

  // Generate if missing
  if (!code) {
    let attempts = 0
    while (attempts < 10) {
      const candidate = generateCode(customer.first_name)
      const { error: updateErr } = await db
        .from('customers')
        .update({ referral_code: candidate })
        .eq('id', customer.id)
        .is('referral_code', null)
      if (!updateErr) { code = candidate; break }
      attempts++
    }
  }

  if (!code) return json({ error: 'Could not generate code' }, 500)

  // Count signups via this code
  const { count } = await db
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', code)

  return json({ code, referral_count: count ?? 0 })
})
