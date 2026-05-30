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

function getDispatchDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const isBeforeNoon = now.getHours() < 12;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const daysToAdd: Record<number, number> = { 1: 3, 2: 2, 4: 4, 5: 3, 6: 2 };
  if (day in daysToAdd) {
    d.setDate(d.getDate() + daysToAdd[day]);
  } else if (day === 3) {
    d.setDate(d.getDate() + (isBeforeNoon ? 1 : 5));
  } else {
    d.setDate(d.getDate() + (isBeforeNoon ? 1 : 4));
  }
  return d;
}

function getArrivalDate(dispatch: Date): Date {
  const d = new Date(dispatch); d.setDate(d.getDate() + 2); return d;
}

function getFirstChargeDate(): Date {
  const d = new Date(); d.setDate(d.getDate() + 30); d.setHours(0, 0, 0, 0); return d;
}

function getRefillShipDate(charge: Date): Date {
  const d = new Date(charge); d.setDate(d.getDate() + 2); return d;
}

function getRefillArrivalDate(charge: Date): Date {
  const d = new Date(charge); d.setDate(d.getDate() + 4); return d;
}

function fmtDay(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let kit_id: string | undefined;
  let email: string | undefined;

  try {
    const body = await req.json();
    kit_id = body.kit_id;
    email  = body.email;
    const {
      first_name, last_name, birth_year, birth_month, phone,
      line1, line2, city, postcode, addons,
    } = body;
    const selectedAddons: string[] = Array.isArray(addons) ? addons : [];

    const kit = KIT_PRICES[kit_id!];
    if (!kit) {
      return new Response(JSON.stringify({ error: 'Invalid kit_id' }), { status: 400, headers: corsHeaders });
    }

    const dispatch     = getDispatchDate();
    const arrival      = getArrivalDate(dispatch);
    const firstCharge  = getFirstChargeDate();
    const refillShip   = getRefillShipDate(firstCharge);
    const refillArrive = getRefillArrivalDate(firstCharge);

    // Block duplicate subscriptions
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
          phone: phone ?? undefined,
          metadata: { kit_id, birth_year: birth_year?.toString(), birth_month: birth_month?.toString() },
        });

    // Compute total amount
    let amount = kit.first_box_pence;
    for (const addonKey of selectedAddons) {
      amount += ADDONS[addonKey]?.pence ?? 0;
    }

    // Create PaymentIntent — saves card for future subscription billing
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      customer: customer.id,
      setup_future_usage: 'off_session',
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
      description: `SOLUM ${kit.name} — First Box`,
      metadata: {
        kit_id:          kit_id!,
        email:           email!,
        first_name:      first_name ?? '',
        last_name:       last_name  ?? '',
        birth_year:      birth_year?.toString()  ?? '',
        birth_month:     birth_month?.toString() ?? '',
        first_charge_ts: String(Math.floor(firstCharge.getTime() / 1000)),
        monthly_pence:   String(kit.monthly_pence),
        addons:          JSON.stringify(selectedAddons),
        phone:           phone ?? '',
      },
    });

    // Capture lead
    await supabase.from('leads').upsert({
      email:              email!.trim().toLowerCase(),
      first_name,
      last_name:          last_name   ?? null,
      birth_year:         birth_year  ?? null,
      birth_month:        birth_month ?? null,
      kit_id,
      stripe_customer_id: customer.id,
      stripe_session_id:  pi.id,
      checkout_status:    'initiated',
      updated_at:         new Date().toISOString(),
    }, { onConflict: 'stripe_session_id' });

    return new Response(JSON.stringify({
      client_secret:     pi.client_secret,
      dispatch_date:     fmtDay(dispatch),
      arrival_date:      fmtDay(arrival),
      first_charge_date: fmtDate(firstCharge),
      refill_ship_date:  fmtDate(refillShip),
      refill_arrive:     fmtDate(refillArrive),
      monthly_price:     kit.monthly_pence / 100,
      amount_pence:      amount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('CREATE_PAYMENT_INTENT_ERROR', err.message, { kit_id, email });
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again or contact contact@bysolum.com.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
