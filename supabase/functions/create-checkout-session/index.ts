import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { getDispatchDate, estDeliveryDate } from '../_shared/dispatch.mjs';

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

// ── Dispatch & billing date helpers ───────────────────────────────────────
//
// Two dispatch days: Thursday and Monday.
// Cutoffs (UK time):
//   Before Wed 12:00 → ships Thursday
//   Wed 12:00 – Sun 12:00 → ships Monday
//   After Sun 12:00 → ships Thursday
//
// Royal Mail Tracked 48 = +2 calendar days (Sat counts as working day).
// First recurring charge = 30 days from purchase, then every 30 days.

/** First recurring charge = 30 days from now. */
function getFirstChargeDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Refill ships 2 days after the charge clears. */
function getRefillShipDate(charge: Date): Date {
  const d = new Date(charge);
  d.setDate(d.getDate() + 2);
  return d;
}

/** Refill arrives 4 days after the charge date (RM T48 after 2-day processing). */
function getRefillArrivalDate(charge: Date): Date {
  const d = new Date(charge);
  d.setDate(d.getDate() + 4);
  return d;
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
    const dispatch     = getDispatchDate();
    const arrival      = estDeliveryDate(dispatch);
    const firstCharge  = getFirstChargeDate();
    const refillShip   = getRefillShipDate(firstCharge);
    const refillArrive = getRefillArrivalDate(firstCharge);

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
      mode: 'payment',
      payment_intent_data: {
        setup_future_usage: 'off_session',
        metadata: { kit_id },
      },
      line_items: [
        { price: firstBoxPrice.id, quantity: 1 },
        ...addonLineItems,
      ],
      custom_text: {
        submit: {
          message: `First box ships ${fmtDay(dispatch)}, arrives ${fmtDay(arrival)}. Your £${(kit.monthly_pence / 100).toFixed(0)}/month subscription starts ${fmtDate(firstCharge)} — cancel any time.`,
        },
        after_submit: {
          message: `Refills dispatched every 30 days from ${fmtDate(refillShip)}. No contracts — cancel from your account.`,
        },
      },
      phone_number_collection: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ['GB'],
      },
      success_url,
      cancel_url,
      metadata: {
        kit_id,
        first_name,
        last_name,
        birth_year:       birth_year?.toString(),
        birth_month:      birth_month?.toString(),
        first_charge_ts:  String(Math.floor(firstCharge.getTime() / 1000)),
        monthly_pence:    String(kit.monthly_pence),
        refill_ship_date: fmtDate(refillShip),
      },
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
