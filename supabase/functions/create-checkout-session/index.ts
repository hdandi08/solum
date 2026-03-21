import Stripe from 'https://esm.sh/stripe@14?target=deno';

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

async function alertError(message: string, context: Record<string, unknown>) {
  console.error('SOLUM_CHECKOUT_ERROR', JSON.stringify({ message, context, ts: new Date().toISOString() }));

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'SOLUM Alerts <alerts@bysolum.com>',
      to: 'harsha@bysolum.com',
      subject: '🚨 [SOLUM] Checkout Error — Action Required',
      html: `<h2 style="color:#c0392b">Checkout Error</h2>
             <p><strong>${message}</strong></p>
             <pre style="background:#f5f5f5;padding:12px">${JSON.stringify(context, null, 2)}</pre>
             <p style="color:#888;font-size:12px">SOLUM · ${new Date().toISOString()}</p>`,
    }),
  }).catch(e => console.error('Failed to send alert email:', e));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let kit_id: string | undefined;
  let email: string | undefined;

  try {
    const body = await req.json();
    kit_id     = body.kit_id;
    email      = body.email;
    const { first_name, last_name, birth_year, birth_month, success_url, cancel_url } = body;

    const kit = KIT_PRICES[kit_id!];
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

    // One-time first box price (created fresh each time — no lookup key needed)
    const firstBoxPrice = await stripe.prices.create({
      currency: 'gbp',
      unit_amount: kit.first_box_pence,
      product_data: { name: `SOLUM ${kit.name} — First Box` },
    });

    // Recurring monthly price — reuse if already exists
    const existingPrices = await stripe.prices.list({ active: true, currency: 'gbp', lookup_keys: [`solum_${kit_id}_monthly`] });
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
    // If within 7 days of month end, skip to the month after to avoid an
    // almost-immediate charge after purchase.
    const now = new Date();
    const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    const monthsAhead = daysLeftInMonth < 7 ? 2 : 1;
    const billingAnchor = Math.floor(new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1).getTime() / 1000);

    // line_items: both one-time (first box) + recurring (monthly).
    // Stripe supports mixing one-time and recurring in subscription mode (API ≥ 2022-11-15).
    // trial_end defers the first recurring charge to the 1st of next month;
    // the one-time first-box item is charged immediately on session completion.
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [
        { price: firstBoxPrice.id,  quantity: 1 },
        { price: monthlyPrice.id,   quantity: 1 },
      ],
      subscription_data: {
        trial_end: billingAnchor,
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
    await alertError(err.message, { kit_id, email, stack: err.stack });
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again or contact contact@bysolum.com.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
