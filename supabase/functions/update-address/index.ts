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

  const { name, line1, line2, city, postcode } = await req.json();
  if (!name || !line1 || !city || !postcode) {
    return new Response(JSON.stringify({ error: 'name, line1, city, postcode are required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Flip all existing current rows to not current (safe even if zero rows)
  await supabase.from('addresses')
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq('customer_id', customer.id)
    .eq('is_current', true);

  // Insert new current address
  const { data: newAddress, error: insertError } = await supabase
    .from('addresses')
    .insert({
      customer_id: customer.id,
      name,
      line1,
      line2: line2 || null,
      city,
      postcode,
      country: 'GB',
      is_current: true,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Address insert error:', insertError);
    return new Response(JSON.stringify({ error: 'Failed to save address' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Sync to Stripe
  if (customer.stripe_customer_id) {
    await stripe.customers.update(customer.stripe_customer_id, {
      shipping: {
        name,
        address: { line1, line2: line2 || undefined, city, postal_code: postcode, country: 'GB' },
      },
    });
  }

  return new Response(JSON.stringify(newAddress), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
