import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const KIT_PRICES: Record<string, { first_box_pence: number; monthly_pence: number; name: string }> = {
  ground:    { first_box_pence: 6500,  monthly_pence: 3800, name: 'GROUND'    },
  ritual:    { first_box_pence: 8500,  monthly_pence: 4800, name: 'RITUAL'    },
  sovereign: { first_box_pence: 11000, monthly_pence: 5800, name: 'SOVEREIGN' },
};

const ADDONS: Record<string, { pence: number; name: string }> = {
  mixing_bowl: { pence: 1000, name: 'SOLUM Silicone Mixing Bowl' },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Shipping date helpers ──────────────────────────────────────────────────

/** Next Monday from today. If today is Monday, returns next week's Monday. */
function nextMondayDispatch(): Date {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntil = day === 1 ? 7 : (1 + 7 - day) % 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** First box arrives ~3 days after dispatch. */
function firstBoxArrival(dispatch: Date): Date {
  const d = new Date(dispatch);
  d.setDate(d.getDate() + 3);
  return d;
}

/**
 * First subscription billing date (25th).
 * If dispatch falls on or before the 7th → same month's 25th.
 * Otherwise → next month's 25th.
 */
function firstBillingDate(dispatch: Date): Date {
  if (dispatch.getDate() <= 7) {
    return new Date(dispatch.getFullYear(), dispatch.getMonth(), 25);
  }
  return new Date(dispatch.getFullYear(), dispatch.getMonth() + 1, 25);
}

/** Refill ships on the 28th of the billing month. */
function refillShipDate(billing: Date): Date {
  return new Date(billing.getFullYear(), billing.getMonth(), 28);
}

/** Refill arrives by the 1st of the month after billing. */
function refillArrivalDate(billing: Date): Date {
  return new Date(billing.getFullYear(), billing.getMonth() + 1, 1);
}

/** "Mon 6 Apr" format for dispatch/arrival. */
function fmtDay(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "25 Apr" format for charge/ship/arrive dates. */
function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

async function alertError(message: string, context: Record<string, unknown>) {
  console.error('SOLUM_CHECKOUT_ERROR', JSON.stringify({ message, context, ts: new Date().toISOString() }));

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'SOLUM Alerts <alert@orders.bysolum.com>',
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
    const { first_name, last_name, birth_year, birth_month, success_url, cancel_url, addons } = body;
    const selectedAddons: string[] = Array.isArray(addons) ? addons : [];

    const kit = KIT_PRICES[kit_id!];
    if (!kit) return new Response(JSON.stringify({ error: 'Invalid kit_id' }), { status: 400, headers: corsHeaders });

    // Shipping & billing schedule
    const dispatch     = nextMondayDispatch();
    const arrival      = firstBoxArrival(dispatch);
    const billing      = firstBillingDate(dispatch);
    const refillShip   = refillShipDate(billing);
    const refillArrive = refillArrivalDate(billing);

    // Block duplicate subscriptions — check if this email already has an active account
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email!.trim().toLowerCase())
      .maybeSingle();

    if (existingCustomer) {
      const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('customer_id', existingCustomer.id)
        .in('status', ['active', 'cancelling', 'past_due'])
        .maybeSingle();

      if (activeSub) {
        return new Response(
          JSON.stringify({ error: 'existing_subscriber' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Create or retrieve Stripe customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data.length > 0
      ? existing.data[0]
      : await stripe.customers.create({
          email,
          name: [first_name, last_name].filter(Boolean).join(' ') || undefined,
          metadata: { kit_id, birth_year: birth_year?.toString(), birth_month: birth_month?.toString() },
        });

    // One-time first box price — name includes dispatch date so it's clear on the Stripe form
    const firstBoxPrice = await stripe.prices.create({
      currency: 'gbp',
      unit_amount: kit.first_box_pence,
      product_data: { name: `SOLUM ${kit.name} — First Box · ships ${fmtDay(dispatch)}, arrives ${fmtDay(arrival)}` },
    });

    // Recurring monthly price — name includes first charge date and refill schedule
    const monthlyPrice = await stripe.prices.create({
      currency: 'gbp',
      unit_amount: kit.monthly_pence,
      recurring: { interval: 'month' },
      product_data: { name: `SOLUM ${kit.name} — Monthly Refill · first charged ${fmtDate(billing)}, ships ${fmtDate(refillShip)}, arrives ${fmtDate(refillArrive)}` },
    });

    // Build add-on line items (one-time, charged with first box)
    const addonLineItems: { price: string; quantity: number }[] = [];
    for (const addonKey of selectedAddons) {
      const addon = ADDONS[addonKey];
      if (!addon) continue;
      const addonPrice = await stripe.prices.create({
        currency: 'gbp',
        unit_amount: addon.pence,
        product_data: { name: addon.name },
      });
      addonLineItems.push({ price: addonPrice.id, quantity: 1 });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [
        { price: firstBoxPrice.id,  quantity: 1 },
        { price: monthlyPrice.id,   quantity: 1 },
        ...addonLineItems,
      ],
      subscription_data: {
        trial_end: Math.floor(billing.getTime() / 1000),
        metadata: { kit_id, birth_year: birth_year?.toString(), birth_month: birth_month?.toString() },
      },
      custom_text: {
        submit: {
          message: `Your first box ships ${fmtDay(dispatch)} and arrives by ${fmtDay(arrival)} — no action needed. Your monthly refill subscription starts ${fmtDate(billing)}: charged that day, ships ${fmtDate(refillShip)}, arrives by ${fmtDate(refillArrive)}.`,
        },
        after_submit: {
          message: `Cancel any time from your account — no questions asked.`,
        },
      },
      shipping_address_collection: {
        allowed_countries: ['GB'],
      },
      success_url,
      cancel_url,
      metadata: { kit_id, first_name, last_name, birth_year: birth_year?.toString(), birth_month: birth_month?.toString() },
    });

    // Capture lead immediately — before the customer reaches Stripe.
    // checkout_status starts as 'initiated'; webhook updates it from here.
    await supabase.from('leads').upsert({
      email,
      first_name,
      last_name:          last_name   ?? null,
      birth_year:         birth_year  ?? null,
      birth_month:        birth_month ?? null,
      kit_id,
      stripe_session_id:  session.id,
      stripe_customer_id: customer.id,
      checkout_status:    'initiated',
      updated_at:         new Date().toISOString(),
    }, { onConflict: 'stripe_session_id' });

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
