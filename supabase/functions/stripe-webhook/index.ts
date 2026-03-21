import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

const KIT_NAMES: Record<string, string> = {
  ground: 'GROUND', ritual: 'RITUAL', sovereign: 'SOVEREIGN',
};

async function sendConfirmationEmail(
  email: string,
  firstName: string,
  kitId: string,
  orderRef: string,
) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) { console.warn('RESEND_API_KEY not set — skipping email'); return; }

  const kitName = KIT_NAMES[kitId] ?? kitId.toUpperCase();

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#08090B;padding:40px 48px;">
          <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:28px;font-weight:700;letter-spacing:0.15em;color:#F0ECE2;text-transform:uppercase;">SOLUM</p>
          <p style="margin:8px 0 0;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;">Your body. Done right.</p>
        </td></tr>

        <!-- Order confirmed -->
        <tr><td style="background:#ffffff;padding:48px 48px 32px;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:600;">Order Confirmed</p>
          <h1 style="margin:0 0 24px;font-size:36px;font-weight:700;letter-spacing:0.04em;color:#08090B;text-transform:uppercase;line-height:1;">Ritual Begins,<br>${firstName}.</h1>
          <p style="margin:0 0 32px;font-size:15px;color:#555;line-height:1.7;">Your ${kitName} Kit is confirmed. Here's everything you need to know.</p>

          <!-- Order ref -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;border:1px solid #e0ddd6;margin-bottom:40px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#888;font-weight:600;">Order Reference</p>
              <p style="margin:0 0 4px;font-size:28px;font-weight:700;letter-spacing:0.1em;color:#08090B;">#${orderRef}</p>
              <p style="margin:0;font-size:12px;color:#888;">Keep this for your records</p>
            </td></tr>
          </table>

          <!-- What happens next -->
          <p style="margin:0 0 20px;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:600;">What Happens Next</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0ddd6;">
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e0ddd6;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">1</td>
                <td><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#08090B;">Confirmation email</p><p style="margin:0;font-size:13px;color:#777;line-height:1.5;">That's this one. You're all set.</p></td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e0ddd6;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">2</td>
                <td><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#08090B;">First box ships within a week</p><p style="margin:0;font-size:13px;color:#777;line-height:1.5;">Your full ${kitName} Kit — tools and consumables. You'll get a tracking email when it's dispatched.</p></td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e0ddd6;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">3</td>
                <td><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#08090B;">Monthly refills on the 1st</p><p style="margin:0;font-size:13px;color:#777;line-height:1.5;">Your first box lasts 4–6 weeks. Refills ship automatically on the 1st of each month — you'll never run out.</p></td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">4</td>
                <td><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#08090B;">Ritual card is in the box</p><p style="margin:0;font-size:13px;color:#777;line-height:1.5;">Step-by-step instructions for your daily and weekly ritual. Everything in the right order.</p></td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#08090B;padding:32px 48px;">
          <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.6;">Questions? Reply to this email or contact us at <a href="mailto:contact@bysolum.com" style="color:#4A8FC7;text-decoration:none;">contact@bysolum.com</a></p>
          <p style="margin:0;font-size:12px;color:#555;">SOLUM · bysolum.com · You can cancel any time from your account.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'SOLUM <no-reply@orders.bysolum.co.uk>',
      to: email,
      subject: `Order confirmed — your ${kitName} Kit is on its way`,
      html,
    }),
  }).catch(e => console.error('Resend error:', e));
}

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

        // Mark lead as completed
        await supabase.from('leads')
          .update({ checkout_status: 'completed', updated_at: new Date().toISOString() })
          .eq('stripe_session_id', session.id);

        // Send confirmation email
        if (email) {
          const orderRef = session.id.slice(-8).toUpperCase();
          await sendConfirmationEmail(email, first_name ?? 'there', kit_id, orderRef);
        }

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

      case 'payment_intent.payment_failed': {
        // Card declined — capture the decline reason on the lead
        const intent = event.data.object as Stripe.PaymentIntent;
        const decline_reason =
          intent.last_payment_error?.decline_code ??
          intent.last_payment_error?.code ??
          'unknown';
        await supabase.from('leads')
          .update({
            checkout_status: 'payment_failed',
            decline_reason,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', intent.customer as string)
          .eq('checkout_status', 'initiated');
        break;
      }

      case 'checkout.session.expired': {
        // High-intent abandonment — went to Stripe, didn't complete
        const session = event.data.object as Stripe.Checkout.Session;
        await supabase.from('leads')
          .update({ checkout_status: 'expired', updated_at: new Date().toISOString() })
          .eq('stripe_session_id', session.id);
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
