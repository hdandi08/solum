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
    .select('id')
    .eq('supabase_user_id', user.id)
    .single();
  if (!customer) return new Response('Customer not found', { status: 404, headers: corsHeaders });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, stripe_subscription_id, status')
    .eq('customer_id', customer.id)
    .in('status', ['active', 'past_due'])
    .single();

  if (!sub) {
    return new Response(JSON.stringify({ error: 'No active subscription found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // current_period_end is the actual end date when cancel_at_period_end is true
  const cancelAt = new Date(updated.current_period_end * 1000).toISOString();

  await supabase.from('subscriptions')
    .update({
      status: 'cancelling',
      cancel_at: cancelAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id);

  return new Response(JSON.stringify({ cancel_at: cancelAt }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
