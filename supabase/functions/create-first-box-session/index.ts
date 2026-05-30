import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Standard first-box prices (pence). Gift and TikTok add £10 premium.
const KIT_BASE_PENCE: Record<string, number> = {
  ground: 6500,
  ritual: 8500,
};

const KIT_NAMES: Record<string, string> = {
  ground: 'GROUND',
  ritual: 'RITUAL',
};

// Sources that carry a £10 premium over standard pricing
const PREMIUM_SOURCES = ['gift', 'tiktok_shop'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let kit_id: string | undefined;
  let email: string | undefined;

  try {
    const body = await req.json();
    kit_id = body.kit_id;
    email = body.email?.trim().toLowerCase();
    const { first_name, last_name, source, success_url, cancel_url } = body;

    if (!KIT_BASE_PENCE[kit_id!]) {
      return new Response(JSON.stringify({ error: 'Invalid kit_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isPremium = PREMIUM_SOURCES.includes(source ?? '');
    const amountPence = KIT_BASE_PENCE[kit_id!] + (isPremium ? 1000 : 0);
    const kitName = KIT_NAMES[kit_id!];
    const effectiveSource = source ?? 'first_batch';

    // Create or retrieve Stripe customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data.length > 0
      ? existing.data[0]
      : await stripe.customers.create({
          email,
          name: [first_name, last_name].filter(Boolean).join(' ') || undefined,
        });

    const price = await stripe.prices.create({
      currency: 'gbp',
      unit_amount: amountPence,
      product_data: { name: `SOLUM ${kitName} Kit` },
    });

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'payment',
      line_items: [{ price: price.id, quantity: 1 }],
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ['GB'] },
      success_url,
      cancel_url,
      metadata: {
        kit_id,
        first_name,
        last_name: last_name ?? '',
        source: effectiveSource,
      },
    });

    // Capture lead
    await supabase.from('leads').upsert({
      email,
      first_name,
      last_name: last_name ?? null,
      kit_id,
      stripe_session_id: session.id,
      stripe_customer_id: customer.id,
      checkout_status: 'initiated',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stripe_session_id' });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('SOLUM_FIRST_BOX_ERROR', JSON.stringify({ message: err.message, kit_id, email }));
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again or contact contact@bysolum.co.uk.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
