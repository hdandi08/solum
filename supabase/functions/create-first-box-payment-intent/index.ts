import { discountedKitSelection, validatePromoPayment, preparePromoAttempt, promoResponse } from '../_shared/metaPromo.ts';
import { canonicalKitItems, multiKitCheckoutEnabled, prepareMultiKitAttempt, createMultiKitPayment, multiKitSummary } from '../_shared/multiKitOrder.ts';
import { campaignMetadata } from '../_shared/campaignAttribution.mjs';
import { createReservedPayment, reservationErrorBody, ReservationError, reservationsEnabled, prepareCheckoutAttempt, bindCheckoutCustomer, checkoutAttemptTime } from '../_shared/checkoutReservation.ts';
import { checkoutStockError } from '../_shared/checkoutStock.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { getDispatchDate, estDeliveryDate } from '../_shared/dispatch.mjs';
import { normalizeOrderSource, resolveAwinCheckoutAttribution } from '../_shared/awin.ts';
import { boundedTrackingId, dynamicPaymentMethodOptions } from '../_shared/paymentMethods.ts';
import { firstBoxPaymentIntentShipping } from '../_shared/firstBoxShipping.ts';

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
    const hasPromo = Object.hasOwn(body,'promo_code') || Object.hasOwn(body,'promo_visitor_token');
    let selection = Object.hasOwn(body, 'items') ? canonicalKitItems(body.items) : (hasPromo ? canonicalKitItems([{kit_id,quantity:1}]) : null);
    const multiKit = hasPromo || (!!selection && selection.total_quantity > 1);
    if(hasPromo) { await validatePromoPayment(supabase,body); selection=discountedKitSelection(selection!); }
    if (selection && !multiKit) kit_id = selection.items[0].kit_id;
    if (multiKit && !multiKitCheckoutEnabled()) throw new ReservationError('multi_kit_unavailable', 409);
    const {
      first_name, last_name, source, phone, site_host, line1, line2, city,
      postcode, ttclid, ttp, fbp, fbc, awc, awin_channel, awin_attribution_token,
      payment_flow,
    } = body;

    if (!multiKit && !KIT_PENCE[kit_id!]) {
      return new Response(JSON.stringify({ error: 'Invalid kit_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stockError = reservationsEnabled() ? null : await checkoutStockError(supabase, kit_id!);
    if (stockError) {
      return new Response(JSON.stringify(stockError.body), {
        status: stockError.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let attempt = multiKit ? null : await prepareCheckoutAttempt(supabase, 'payment_intent', body);

    const effectiveSource = normalizeOrderSource(source);
    const awinAttribution = await resolveAwinCheckoutAttribution({
      awc,
      token: awin_attribution_token,
      channel: awin_channel,
      secret: Deno.env.get('AWIN_ATTRIBUTION_SECRET') ?? '',
    });
    const amount = multiKit ? selection!.amount_pence : KIT_PENCE[kit_id!];
    const kitName = KIT_NAMES[kit_id!];

    const shipping = firstBoxPaymentIntentShipping({
      firstName: first_name,
      lastName: last_name,
      line1,
      line2,
      city,
      postcode,
    }, { deferToWallet: payment_flow === 'express_wallet' });

    // Create or retrieve Stripe customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data.length > 0
      ? existing.data[0]
      : await stripe.customers.create({
          email,
          name: [first_name, last_name].filter(Boolean).join(' ') || undefined,
          phone: phone ?? undefined,
        });

    if (multiKit) {
      attempt = hasPromo ? await preparePromoAttempt(supabase,body,selection!,customer.id) : await prepareMultiKitAttempt(supabase, body, selection!, customer.id);
      customer.id = attempt.stripe_customer_id;
    } else customer.id = await bindCheckoutCustomer(supabase, attempt, customer.id);

    const dispatch = getDispatchDate(checkoutAttemptTime(attempt));
    const arrival = estDeliveryDate(dispatch);

    // One-time PaymentIntent — no setup_future_usage, no subscription
    const paymentParams = {
      amount,
      currency: 'gbp',
      ...dynamicPaymentMethodOptions(),
      customer: customer.id,
      ...(shipping ? { shipping } : {}),
      description: `SOLUM ${multiKit ? multiKitSummary(selection!.items) : kitName} — One-time First Box`,
      metadata: {
        ...campaignMetadata(body.campaign_attribution),
        ...(!multiKit ? { kit_id: kit_id! } : {}),
        email:        email!,
        first_name:   first_name  ?? '',
        last_name:    last_name   ?? '',
        source:       effectiveSource,
        phone:        phone ?? '',
        site_host:    site_host ?? '',
        ttclid:       boundedTrackingId(ttclid),
        ttp:          boundedTrackingId(ttp),
        fbp:          boundedTrackingId(fbp),
        fbc:          boundedTrackingId(fbc),
        ...(awinAttribution.awc ? { awc: awinAttribution.awc } : {}),
        ...(awinAttribution.channel ? { awin_channel: awinAttribution.channel } : {}),
        dispatch_date: fmtDay(dispatch),
        arrival_date:  fmtDay(arrival),
      },
    };
    const pi = multiKit
      ? await createMultiKitPayment(supabase, stripe, attempt, paymentParams)
      : await createReservedPayment(supabase, stripe, 'payment_intent', kit_id!, attempt, paymentParams);

    // Capture lead
    await supabase.from('leads').upsert({
      email,
      first_name,
      last_name:          last_name ?? null,
      kit_id: multiKit ? null : kit_id,
      stripe_customer_id: customer.id,
      stripe_session_id:  pi.id,
      checkout_status:    'initiated',
      updated_at:         new Date().toISOString(),
    }, { onConflict: 'stripe_session_id' });

    return new Response(JSON.stringify({
      ...(multiKit ? { checkout_flow: 'multi_kit_v1', order_items: attempt.items, total_quantity: attempt.total_quantity } : {}),
      reservation_expires_at: pi.reservation_expires_at,
      reservation_server_now: new Date().toISOString(),
      client_secret:  pi.client_secret,
      dispatch_date:  fmtDay(dispatch),
      arrival_date:   fmtDay(arrival),
      amount_pence:   amount,
      ...(hasPromo ? {promo:promoResponse(attempt)} : {}),
      livemode:       pi.livemode,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    if (err instanceof ReservationError) return new Response(JSON.stringify({...reservationErrorBody(err.code), ...('kit_id' in err ? {kit_id:err.kit_id,available_count:(err as any).available_count} : {})}), {status:err.status,headers:{...corsHeaders,'Content-Type':'application/json'}});
    console.error('FIRST_BOX_PAYMENT_INTENT_ERROR', { kit_id });
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again or contact contact@bysolum.co.uk.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
