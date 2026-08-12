import { ExpressCheckoutElement, useElements, useStripe } from '@stripe/react-stripe-js';
import {
  capture,
  fbInitiateCheckout,
  getMetaIds,
  getTikTokIds,
  identify,
  ttqAddPaymentInfo,
  ttqIdentify,
  ttqInitiateCheckout,
} from '../lib/analytics.js';
import { captureAwinAttribution } from '../lib/awinAttribution.js';
import {
  buildExpressPaymentIntentBody,
  EXPRESS_CHECKOUT_EVENTS,
  expressCheckoutElementOptions,
  notifyExpressPaymentFailed,
} from '../lib/expressCheckout.js';

const errText = (message) => String(message ?? '').slice(0, 200);

export default function ExpressCheckout({
  kitId,
  kitName,
  price,
  source,
  supabaseUrl,
  authHeaders,
  onError,
  onAvailability,
}) {
  const stripe = useStripe();
  const elements = useElements();

  async function onConfirm(event) {
    if (!stripe || !elements) return;
    onError('');

    const { error: submitError } = await elements.submit();
    if (submitError) {
      capture(EXPRESS_CHECKOUT_EVENTS.error, {
        kit: kitId,
        source,
        stage: 'submit',
        message: errText(submitError.message),
      });
      notifyExpressPaymentFailed(event, submitError.message ?? 'Could not start payment.');
      onError(submitError.message ?? 'Could not start payment.');
      return;
    }

    try {
      const { buyer, body } = await buildExpressPaymentIntentBody({
        event,
        kitId,
        source,
        siteHost: window.location.hostname,
        tikTokIds: getTikTokIds(),
        metaIds: getMetaIds(),
        attribution: captureAwinAttribution(),
      });
      const response = await fetch(`${supabaseUrl}/functions/v1/create-first-box-payment-intent`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        capture(EXPRESS_CHECKOUT_EVENTS.error, {
          kit: kitId,
          source,
          stage: 'create_intent',
          message: errText(data.message ?? data.error),
        });
        notifyExpressPaymentFailed(event, data.message ?? data.error ?? 'Payment could not be started.');
        onError(data.message ?? data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      identify(buyer.email, { first_name: buyer.firstName, kit: kitId, source });
      capture(EXPRESS_CHECKOUT_EVENTS.initiated, {
        kit: kitId,
        source,
        price,
        method: 'express',
        wallet: event.expressPaymentType,
      });
      fbInitiateCheckout(kitId, price, { email: buyer.email });
      ttqIdentify(buyer.email);
      ttqInitiateCheckout(kitId, kitName, price);
      ttqAddPaymentInfo(kitId, kitName, price);
      try { sessionStorage.setItem('solum_buyer_email', buyer.email); } catch { /* unavailable */ }

      const successParams = new URLSearchParams({
        kit: kitId,
        source,
        dispatch: data.dispatch_date ?? '',
        arrival: data.arrival_date ?? '',
        amount: String(data.amount_pence),
      });
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: data.client_secret,
        confirmParams: { return_url: `${window.location.origin}/success?${successParams.toString()}` },
        redirect: 'if_required',
      });

      if (confirmError) {
        capture(EXPRESS_CHECKOUT_EVENTS.error, {
          kit: kitId,
          source,
          stage: 'confirm',
          message: errText(confirmError.message),
        });
        notifyExpressPaymentFailed(event, confirmError.message ?? 'Payment failed.');
        onError(confirmError.message ?? 'Payment failed. Please try again.');
        return;
      }
      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        successParams.set('ref', paymentIntent.id);
        window.location.href = `/success?${successParams.toString()}`;
        return;
      }
      capture(EXPRESS_CHECKOUT_EVENTS.error, {
        kit: kitId,
        source,
        stage: 'confirm',
        message: `unexpected status ${paymentIntent?.status ?? 'unknown'}`,
      });
      notifyExpressPaymentFailed(event, 'Payment could not be completed. Please try again or pay by card.');
      onError('Something went wrong. Please try again or pay by card.');
    } catch {
      capture(EXPRESS_CHECKOUT_EVENTS.error, { kit: kitId, source, stage: 'network', message: '' });
      notifyExpressPaymentFailed(event, 'Network error. Please try again or pay by card.');
      onError('Network error. Please try again or pay by card.');
    }
  }

  return (
    <ExpressCheckoutElement
      options={expressCheckoutElementOptions()}
      onReady={({ availablePaymentMethods }) => {
        const wallets = availablePaymentMethods ?? {};
        capture(EXPRESS_CHECKOUT_EVENTS.availability, {
          available: !!availablePaymentMethods,
          apple_pay: !!wallets.applePay,
          google_pay: !!wallets.googlePay,
          link: !!wallets.link,
          paypal: !!wallets.paypal,
          kit: kitId,
          source,
        });
        onAvailability(!!availablePaymentMethods);
      }}
      onClick={(event) => {
        capture(EXPRESS_CHECKOUT_EVENTS.clicked, {
          kit: kitId,
          source,
          wallet: event.expressPaymentType,
        });
        event.resolve();
      }}
      onConfirm={onConfirm}
      onCancel={() => capture(EXPRESS_CHECKOUT_EVENTS.cancelled, { kit: kitId, source })}
    />
  );
}
