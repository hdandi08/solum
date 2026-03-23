// supabase/functions/update-customer/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

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

  const { data: customer } = await supabase
    .from('customers')
    .select('id, stripe_customer_id')
    .eq('supabase_user_id', user.id)
    .single();
  if (!customer) return new Response('Customer not found', { status: 404, headers: corsHeaders });

  const { first_name, last_name } = await req.json();
  if (!first_name?.trim()) {
    return new Response(JSON.stringify({ error: 'first_name is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { error: updateError } = await supabase
    .from('customers')
    .update({
      first_name: first_name.trim(),
      last_name:  last_name?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customer.id);

  if (updateError) {
    return new Response(JSON.stringify({ error: 'Failed to update name' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Sync full name to Stripe
  if (customer.stripe_customer_id) {
    const fullName = [first_name.trim(), last_name?.trim()].filter(Boolean).join(' ');
    await stripe.customers.update(customer.stripe_customer_id, { name: fullName });
  }

  return new Response(JSON.stringify({ first_name: first_name.trim(), last_name: last_name?.trim() || null }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
