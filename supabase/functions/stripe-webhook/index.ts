import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

async function logEvent(
  supabase: ReturnType<typeof createClient>,
  stripe_event_id: string,
  event_type: string,
  customer_id: string | null,
  data: Record<string, unknown>
) {
  await supabase.from('events').insert({ stripe_event_id, event_type, customer_id, data });
}
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { kit_id, first_name, last_name, birth_year, birth_month } = session.metadata ?? {};
        const email = session.customer_details?.email ?? session.customer_email;
        const stripe_customer_id = session.customer as string;
        const stripe_subscription_id = session.subscription as string;

        // Upsert customer
        const { data: customer } = await supabase
          .from('customers')
          .upsert({
            email,
            first_name,
            last_name,
            birth_year: birth_year ? parseInt(birth_year) : null,
            birth_month: birth_month ? parseInt(birth_month) : null,
            stripe_customer_id,
            kit_id,
            subscribed_at: new Date().toISOString(),
          }, { onConflict: 'email' })
          .select()
          .single();

        // Create subscription record
        const { data: sub } = await supabase
          .from('subscriptions')
          .insert({
            customer_id: customer.id,
            stripe_subscription_id,
            kit_id,
            status: 'active',
            months_active: 0,
          })
          .select()
          .single();

        // Create first_box order
        await supabase.from('orders').insert({
          customer_id: customer.id,
          subscription_id: sub.id,
          stripe_payment_id: session.payment_intent as string,
          kit_id,
          order_type: 'first_box',
          box_number: null,
          amount_pence: session.amount_total ?? 0,
          status: 'paid',
        });

        break;
      }

      case 'invoice.paid': {
        // Fires each month after the first — create a refill order and increment months_active
        const invoice = event.data.object as Stripe.Invoice;
        const stripe_subscription_id = invoice.subscription as string;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*, customers(*)')
          .eq('stripe_subscription_id', stripe_subscription_id)
          .single();

        if (!sub) break;

        // Don't double-count the first invoice (covered by checkout.session.completed)
        if (invoice.billing_reason === 'subscription_create') break;

        const months_active = sub.months_active + 1;

        await supabase
          .from('subscriptions')
          .update({
            months_active,
            current_period_start: new Date(invoice.period_start * 1000).toISOString(),
            current_period_end:   new Date(invoice.period_end   * 1000).toISOString(),
          })
          .eq('id', sub.id);

        await supabase.from('orders').insert({
          customer_id: sub.customer_id,
          subscription_id: sub.id,
          stripe_payment_id: invoice.payment_intent as string,
          kit_id: sub.kit_id,
          order_type: 'refill',
          box_number: months_active,
          amount_pence: invoice.amount_paid,
          status: 'paid',
        });

        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'customer.subscription.paused': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscriptions')
          .update({ status: 'paused' })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'customer.subscription.resumed': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'invoice.payment_failed': {
        // Payment failed — mark subscription past_due so we can prompt the customer
        const invoice = event.data.object as Stripe.Invoice;
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription as string);
        break;
      }

      case 'invoice.payment_action_required': {
        // 3DS/SCA required (common with UK cards) — same treatment as failed until customer authenticates
        const invoice = event.data.object as Stripe.Invoice;
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription as string);
        break;
      }

      case 'customer.subscription.updated': {
        // Kit upgrade/downgrade or any subscription change — keep kit_id in sync
        const sub = event.data.object as Stripe.Subscription;
        const kit_id = sub.metadata?.kit_id;
        const update: Record<string, string> = { status: sub.status };
        if (kit_id) update.kit_id = kit_id;
        await supabase
          .from('subscriptions')
          .update(update)
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await supabase
          .from('orders')
          .update({ status: 'disputed' })
          .eq('stripe_payment_id', dispute.payment_intent as string);
        await logEvent(supabase, event.id, event.type, null, {
          dispute_id: dispute.id, reason: dispute.reason, amount_pence: dispute.amount,
        });
        break;
      }

      // ── Behavioural events ──────────────────────────────────────

      case 'checkout.session.expired': {
        // High-intent abandonment — went to checkout, didn't complete
        const session = event.data.object as Stripe.Checkout.Session;
        await logEvent(supabase, event.id, event.type, null, {
          kit_id: session.metadata?.kit_id,
          email: session.customer_details?.email ?? session.customer_email,
        });
        break;
      }

      case 'billing_portal.session.created': {
        // Customer opened billing portal — potential churn signal
        const portal = event.data.object as { customer: string; return_url?: string };
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('stripe_customer_id', portal.customer)
          .single();
        await logEvent(supabase, event.id, event.type, customer?.id ?? null, {
          stripe_customer_id: portal.customer,
        });
        break;
      }

      case 'payment_method.attached': {
        // Customer added / updated card — often recovering from past_due
        const pm = event.data.object as Stripe.PaymentMethod;
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('stripe_customer_id', pm.customer as string)
          .single();
        // Restore active status if they were past_due
        if (customer) {
          await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('customer_id', customer.id)
            .eq('status', 'past_due');
        }
        await logEvent(supabase, event.id, event.type, customer?.id ?? null, {
          card_brand: pm.card?.brand, card_last4: pm.card?.last4,
        });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await supabase
          .from('orders')
          .update({ status: 'refunded' })
          .eq('stripe_payment_id', charge.payment_intent as string);
        await logEvent(supabase, event.id, event.type, null, {
          amount_refunded_pence: charge.amount_refunded, reason: charge.refunds?.data[0]?.reason,
        });
        break;
      }

      case 'invoice.upcoming': {
        // 7 days before renewal — useful for pre-shipment comms and loyalty prompts
        const invoice = event.data.object as Stripe.Invoice;
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id, customer_id, months_active, kit_id')
          .eq('stripe_subscription_id', invoice.subscription as string)
          .single();
        await logEvent(supabase, event.id, event.type, sub?.customer_id ?? null, {
          subscription_id: sub?.id,
          months_active: sub?.months_active,
          kit_id: sub?.kit_id,
          next_box_number: (sub?.months_active ?? 0) + 1,
          amount_pence: invoice.amount_due,
        });
        break;
      }

      case 'customer.updated': {
        // Address or email changed — keep shipping details in sync
        const cust = event.data.object as Stripe.Customer;
        const update: Record<string, string | null> = {};
        if (typeof cust.email === 'string') update.email = cust.email;
        if (cust.name) {
          const parts = cust.name.trim().split(' ');
          update.first_name = parts[0];
          update.last_name  = parts.slice(1).join(' ') || null;
        }
        if (Object.keys(update).length > 0) {
          await supabase.from('customers').update(update).eq('stripe_customer_id', cust.id);
        }
        await logEvent(supabase, event.id, event.type, null, { stripe_customer_id: cust.id });
        break;
      }

      case 'charge.dispute.funds_withdrawn':
      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute;
        await logEvent(supabase, event.id, event.type, null, {
          dispute_id: dispute.id,
          status: dispute.status,
          outcome: (dispute as Record<string, unknown>).outcome ?? null,
        });
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(`Handler error: ${err.message}`, { status: 500 });
  }
});
