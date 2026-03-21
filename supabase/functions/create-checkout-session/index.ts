import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

const KIT_PRICES: Record<string, { first_box_pence: number; monthly_pence: number; name: string }> = {
  ground:    { first_box_pence: 5500,  monthly_pence: 3800, name: 'GROUND'    },
  ritual:    { first_box_pence: 8500,  monthly_pence: 4800, name: 'RITUAL'    },
  sovereign: { first_box_pence: 11000, monthly_pence: 5800, name: 'SOVEREIGN' },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { kit_id, email, first_name, last_name, birth_year, birth_month, success_url, cancel_url } = await req.json();

    const kit = KIT_PRICES[kit_id];
    if (!kit) return new Response(JSON.stringify({ error: 'Invalid kit_id' }), { status: 400, headers: corsHeaders });

    // Create or retrieve Stripe customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data.length > 0
      ? existing.data[0]
      : await stripe.customers.create({
          email,
          name: [first_name, last_name].filter(Boolean).join(' ') || undefined,
          metadata: { kit_id, birth_year: birth_year?.toString(), birth_month: birth_month?.toString() },
        });

    // Create a one-time price for the first box
    const firstBoxPrice = await stripe.prices.create({
      currency: 'gbp',
      unit_amount: kit.first_box_pence,
      product_data: { name: `SOLUM ${kit.name} — First Box` },
    });

    // Create or retrieve a recurring price for the monthly subscription
    const existingPrices = await stripe.prices.list({
      active: true,
      currency: 'gbp',
      lookup_keys: [`solum_${kit_id}_monthly`],
    });
    const monthlyPrice = existingPrices.data.length > 0
      ? existingPrices.data[0]
      : await stripe.prices.create({
          currency: 'gbp',
          unit_amount: kit.monthly_pence,
          recurring: { interval: 'month' },
          lookup_key: `solum_${kit_id}_monthly`,
          product_data: { name: `SOLUM ${kit.name} — Monthly Refill` },
        });

    // Billing anchor: 1st of next month.
    // If purchase is within 7 days of month end, skip to 1st of month after next
    // so the customer isn't charged almost immediately.
    const now = new Date();
    const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    const monthsAhead = daysLeftInMonth < 7 ? 2 : 1;
    const billingAnchor = Math.floor(new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1).getTime() / 1000);

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [
        { price: monthlyPrice.id, quantity: 1 },
      ],
      subscription_data: {
        trial_end: billingAnchor,
        add_invoice_items: [{ price: firstBoxPrice.id, quantity: 1 }],
        metadata: { kit_id, birth_year: birth_year?.toString(), birth_month: birth_month?.toString() },
      },
      success_url,
      cancel_url,
      metadata: { kit_id, first_name, last_name, birth_year: birth_year?.toString(), birth_month: birth_month?.toString() },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
