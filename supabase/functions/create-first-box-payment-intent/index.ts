import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { getDispatchDate, estDeliveryDate } from '../_shared/dispatch.mjs';
import { normalizeOrderSource, resolveAwinCheckoutAttribution } from '../_shared/awin.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const KIT_PENCE: Record<string, number> = { ground: 6500, ritual: 8500 };
const KIT_NAMES: Record<string, string> = { ground: 'GROUND', ritual: 'RITUAL' };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function fmtDay(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let kit_id: string | undefined;
  let email: string | undefined;

  try {
    const body = await req.json();
    kit_id = body.kit_id;
    email  = body.email?.trim().toLowerCase();
    const {
      first_name, last_name, source, phone, site_host, line1, line2, city,
      postcode, ttclid, ttp, awc, awin_channel, awin_attribution_token,
    } = body;

    if (!KIT_PENCE[kit_id!]) {
      return new Response(JSON.stringify({ error: 'Invalid kit_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stock check — prevent payment for a sold-out kit
    const { data: inv } = await supabase
      .from('kit_inventory')
      .select('available_count')
      .eq('kit_id', kit_id)
      .maybeSingle();
    if (inv !== null && inv.available_count <= 0) {
      return new Response(
        JSON.stringify({ error: 'sold_out', message: 'This kit is currently sold out.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const effectiveSource = normalizeOrderSource(source);
    const awinAttribution = await resolveAwinCheckoutAttribution({
      awc,
      token: awin_attribution_token,
      channel: awin_channel,
      secret: Deno.env.get('AWIN_ATTRIBUTION_SECRET') ?? '',
    });
    const amount = KIT_PENCE[kit_id!];
    const kitName = KIT_NAMES[kit_id!];

    const dispatch = getDispatchDate();
    const arrival  = estDeliveryDate(dispatch);

    // Create or retrieve Stripe customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data.length > 0
      ? existing.data[0]
      : await stripe.customers.create({
          email,
          name: [first_name, last_name].filter(Boolean).join(' ') || undefined,
          phone: phone ?? undefined,
        });

    // One-time PaymentIntent — no setup_future_usage, no subscription
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      payment_method_types: ['card'],
      customer: customer.id,
      shipping: {
        name: [first_name, last_name].filter(Boolean).join(' '),
        address: {
          line1,
          ...(line2 ? { line2 } : {}),
          city,
          postal_code: postcode,
          country: 'GB',
        },
      },
      description: `SOLUM ${kitName} — One-time First Box`,
      metadata: {
        kit_id:       kit_id!,
        email:        email!,
        first_name:   first_name  ?? '',
        last_name:    last_name   ?? '',
        source:       effectiveSource,
        phone:        phone ?? '',
        site_host:    site_host ?? '',
        ttclid:       ttclid ?? '',
        ttp:          ttp ?? '',
        ...(awinAttribution.awc ? { awc: awinAttribution.awc } : {}),
        ...(awinAttribution.channel ? { awin_channel: awinAttribution.channel } : {}),
        dispatch_date: fmtDay(dispatch),
        arrival_date:  fmtDay(arrival),
      },
    });

    // Capture lead
    await supabase.from('leads').upsert({
      email,
      first_name,
      last_name:          last_name ?? null,
      kit_id,
      stripe_customer_id: customer.id,
      stripe_session_id:  pi.id,
      checkout_status:    'initiated',
      updated_at:         new Date().toISOString(),
    }, { onConflict: 'stripe_session_id' });

    return new Response(JSON.stringify({
      client_secret:  pi.client_secret,
      dispatch_date:  fmtDay(dispatch),
      arrival_date:   fmtDay(arrival),
      amount_pence:   amount,
      livemode:       pi.livemode,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch {
    console.error('FIRST_BOX_PAYMENT_INTENT_ERROR', { kit_id });
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again or contact contact@bysolum.co.uk.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
