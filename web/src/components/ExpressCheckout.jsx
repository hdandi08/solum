import { paymentKitOrder } from '../lib/kitOrder.js';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { rememberPaymentResult, rememberPaymentOrder } from '../lib/purchaseConfirmation.js';
import {localiseReservation,withReservationAttempt,clearReservationAttempt,canConfirmReservation,releaseReservation} from '../lib/reservation.js';
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
  expressWalletAvailability,
  notifyExpressPaymentFailed,
  startExpressLoadTracking,
} from '../lib/expressCheckout.js';

const errText = (message) => String(message ?? '').slice(0, 200);

export default function ExpressCheckout({
  kitId,
  items,
  attemptRef,
  onBusyChange,
  kitName,
  source,
  supabaseUrl,
  authHeaders,
  onError,
  onSoldOut,
  onAvailability,
  onLoadError,
}) {
  const loadMonitor = useRef(null);
  const localAttempt = useRef(null);
  const submitting = useRef(false);
  const activeAttempt = attemptRef ?? localAttempt;
  useEffect(() => {
    const monitor = startExpressLoadTracking({ capture, kit: kitId, source });
    loadMonitor.current = monitor;
    return () => monitor.stop();
  }, [kitId, source]);
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  async function onConfirm(event) {
    if (!stripe || !elements || submitting.current) return;
    submitting.current = true;
    onBusyChange?.(true);
    onError('');
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        capture(EXPRESS_CHECKOUT_EVENTS.error, { kit: kitId, source, stage: 'submit', message: errText(submitError.message) });
        notifyExpressPaymentFailed(event, submitError.message ?? 'Could not start payment.');
        onError(submitError.message ?? 'Could not start payment.');
        return;
      }
      const { buyer, body } = await buildExpressPaymentIntentBody({
        event, kitId, items, source, siteHost: window.location.hostname,
        tikTokIds: getTikTokIds(), metaIds: getMetaIds(), attribution: captureAwinAttribution(),
      });
      const bodyKey = JSON.stringify(body);
      let data;
      if (activeAttempt.current?.checkout_body_key === bodyKey && canConfirmReservation(activeAttempt.current.reservation_expires_at)) {
        data = activeAttempt.current;
      } else {
        // A wallet retry with changed delivery/details must retire the first
        // payable attempt. Processing/completed payments reject that release.
        if (activeAttempt.current) {
          await releaseReservation(supabaseUrl, authHeaders, activeAttempt.current);
          activeAttempt.current = null;
          clearReservationAttempt('express');
        }
        const response = await fetch(`${supabaseUrl}/functions/v1/create-first-box-payment-intent`, {
          method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(await withReservationAttempt(body, 'express')),
        });
        data = localiseReservation(await response.json());
        if (!response.ok) {
          if (['reservation_expired', 'sold_out'].includes(data.error)) clearReservationAttempt('express');
          capture(EXPRESS_CHECKOUT_EVENTS.error, { kit: kitId, source, stage: 'create_intent', message: errText(data.message ?? data.error) });
          notifyExpressPaymentFailed(event, data.message ?? data.error ?? 'Payment could not be started.');
          if (response.status === 409 && data.error === 'sold_out' && onSoldOut) { await onSoldOut(body); return; }
          onError(data.message ?? data.error ?? 'Something went wrong. Please try again.');
          return;
        }
        data = { ...data, checkout_body_key: bodyKey };
        activeAttempt.current = data;
        try { sessionStorage.setItem('solum_payment_retry', JSON.stringify({ clientSecret: data.client_secret, payInfo: data, form: body, kit: kitId, items: items ?? [{ kit_id: kitId, quantity: 1 }], source, flow: 'express' })); } catch { /* Keep the attempt in memory when persistence is unavailable. */ }
      }
      const order = paymentKitOrder(data, items ?? [{ kit_id: kitId, quantity: 1 }]);
      if (!canConfirmReservation(data.reservation_expires_at)) {
        notifyExpressPaymentFailed(event, 'Your reservation has ended. Please try again.');
        onError('Your reservation has ended. Please try again.'); return;
      }
      rememberPaymentOrder(data.client_secret, order.items);
      const analyticsKit = order.totalQuantity > 1 ? null : kitId;
      const analyticsItems = order.totalQuantity > 1 ? order.items : undefined;
      const value = order.amountPence / 100;
      identify(buyer.email, { first_name: buyer.firstName, kit: analyticsKit, source });
      capture(EXPRESS_CHECKOUT_EVENTS.initiated, { kit: analyticsKit, source, price: value, items: order.items, total_quantity: order.totalQuantity, method: 'express', wallet: event.expressPaymentType });
      fbInitiateCheckout(analyticsKit, value, { email: buyer.email }, analyticsItems);
      ttqIdentify(buyer.email);
      ttqInitiateCheckout(analyticsKit, kitName, value, analyticsItems);
      ttqAddPaymentInfo(analyticsKit, kitName, value, analyticsItems);
      try { sessionStorage.setItem('solum_buyer_email', buyer.email); } catch { /* unavailable */ }
      const successParams = new URLSearchParams({ kit: kitId, source, dispatch: data.dispatch_date ?? '', arrival: data.arrival_date ?? '', amount: String(data.amount_pence) });
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements, clientSecret: data.client_secret,
        confirmParams: { return_url: `${window.location.origin}/success?${successParams.toString()}` }, redirect: 'if_required',
      });
      if (confirmError) {
        capture(EXPRESS_CHECKOUT_EVENTS.error, { kit: kitId, source, stage: 'confirm', message: errText(confirmError.message) });
        notifyExpressPaymentFailed(event, confirmError.message ?? 'Payment failed.');
        onError(confirmError.message ?? 'Payment failed. Please try again.'); return;
      }
      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        const paymentResult = rememberPaymentResult(paymentIntent, kitId, undefined, order.items);
        activeAttempt.current = null;
        clearReservationAttempt('express'); successParams.set('ref', paymentIntent.id);
        navigate(`/success?${successParams.toString()}`, { state: { paymentResult } }); return;
      }
      capture(EXPRESS_CHECKOUT_EVENTS.error, { kit: kitId, source, stage: 'confirm', message: `unexpected status ${paymentIntent?.status ?? 'unknown'}` });
      notifyExpressPaymentFailed(event, 'Payment could not be completed. Please try again or pay by card.');
      onError('Something went wrong. Please try again or pay by card.');
    } catch (cause) {
      capture(EXPRESS_CHECKOUT_EVENTS.error, { kit: kitId, source, stage: 'network', message: '' });
      notifyExpressPaymentFailed(event, 'Payment could not be completed. Please try again or pay by card.');
      onError(cause.message || 'Network error. Please try again or pay by card.');
    } finally {
      submitting.current = false;
      onBusyChange?.(false);
    }
  }

  return (
    <ExpressCheckoutElement
      options={expressCheckoutElementOptions()}
      onReady={({ availablePaymentMethods }) => {
        const wallets = expressWalletAvailability(availablePaymentMethods);
        capture(EXPRESS_CHECKOUT_EVENTS.availability, {
          ...wallets, kit: kitId, source,
          ...loadMonitor.current?.finish(),
        });
        onAvailability(wallets.available);
      }}
      onAvailablePaymentMethodsChange={({ paymentMethods }) => {
        const wallets = expressWalletAvailability(paymentMethods);
        capture(EXPRESS_CHECKOUT_EVENTS.availability, { ...wallets, kit: kitId, source, reason: 'changed' });
        onAvailability(wallets.available);
      }}
      onLoadError={({ error }) => {
        capture(EXPRESS_CHECKOUT_EVENTS.error, { kit: kitId, source, stage: 'load', code: error?.code, ...loadMonitor.current?.finish() });
        onAvailability(false);
        onLoadError?.();
      }}
      onClick={(event) => {
        capture(EXPRESS_CHECKOUT_EVENTS.clicked, {
          kit: kitId,
          source,
          wallet: event.expressPaymentType,
        });
        onBusyChange?.(true);
        event.resolve();
      }}
      onConfirm={onConfirm}
      onCancel={() => { if (!submitting.current) onBusyChange?.(false); capture(EXPRESS_CHECKOUT_EVENTS.cancelled, { kit: kitId, source }); }}
    />
  );
}
