// supabase/functions/get-account/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  // Try to find customer by supabase_user_id first (all logins after the first)
  let { data: customer } = await supabase
    .from('customers')
    .select('id, email, first_name, last_name, kit_id, supabase_user_id')
    .eq('supabase_user_id', user.id)
    .maybeSingle();

  // First login: find by email and atomically link the supabase_user_id
  if (!customer) {
    const { data } = await supabase
      .from('customers')
      .select('id, email, first_name, last_name, kit_id, supabase_user_id')
      .eq('email', user.email!.trim().toLowerCase())
      .maybeSingle();
    customer = data;

    if (customer && !customer.supabase_user_id) {
      // Link this auth user to the customer record — idempotent (only runs if null)
      await supabase
        .from('customers')
        .update({ supabase_user_id: user.id, updated_at: new Date().toISOString() })
        .eq('id', customer.id)
        .is('supabase_user_id', null);
    }
  }

  if (!customer) {
    return new Response(JSON.stringify({ customer: null, subscription: null, address: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const [{ data: subscription }, { data: address }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, kit_id, status, months_active, current_period_end, cancel_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('addresses')
      .select('id, name, line1, line2, city, postcode, country')
      .eq('customer_id', customer.id)
      .eq('is_current', true)
      .maybeSingle(),
  ]);

  return new Response(JSON.stringify({ customer, subscription, address }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
