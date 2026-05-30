import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function StepPayment({ activeKit, payInfo, form, onBack }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handlePay(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success?kit=${activeKit.id}`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.');
      setLoading(false);
    } else if (paymentIntent?.status === 'succeeded') {
      window.location.href = `/success?kit=${activeKit.id}`;
    } else {
      setError('Something went wrong. Please try again or contact contact@bysolum.com.');
      setLoading(false);
    }
  }

  const totalPrice = (payInfo.amount_pence / 100).toFixed(0);

  return (
    <form onSubmit={handlePay} noValidate>
      <div className="co-step-heading">Payment.</div>
      <div className="co-step-subhead">
        Your card details are encrypted — never stored on our servers.
      </div>

      {/* Order summary pill — two clearly separated charges */}
      <div className="co-order-pill">
        <div className="co-order-pill-kit">{activeKit.name} · First Box</div>

        {/* Charge 1: today */}
        <div className="co-order-pill-charge-row">
          <span className="co-order-pill-charge-label">Charged today</span>
          <span className="co-order-pill-charge-amount">£{totalPrice}</span>
        </div>
        <div className="co-order-pill-detail">
          Ships {payInfo.dispatch_date} · Arrives {payInfo.arrival_date}
        </div>

        <div className="co-order-pill-divider" />

        {/* Charge 2: recurring */}
        <div className="co-order-pill-charge-row">
          <span className="co-order-pill-charge-label">Then monthly from {payInfo.first_charge_date}</span>
          <span className="co-order-pill-charge-amount">£{payInfo.monthly_price}/mo</span>
        </div>
        <div className="co-order-pill-cancel">
          🚫 Cancel any time — no lock-in, no questions asked
        </div>
      </div>

      <div className="co-payment-element-wrap">
        <PaymentElement options={{
          layout: 'tabs',
          defaultValues: {
            billingDetails: {
              name:    [form.first_name, form.last_name].filter(Boolean).join(' ') || undefined,
              email:   form.email || undefined,
              phone:   form.phone || undefined,
              address: {
                line1:       form.line1    || undefined,
                line2:       form.line2    || undefined,
                city:        form.city     || undefined,
                postal_code: form.postcode || undefined,
                country:     'GB',
              },
            },
          },
          fields: { billingDetails: 'never' },
        }} />
      </div>

      {error && <div className="co-error">{error}</div>}

      <button type="submit" className="co-submit" disabled={!stripe || !elements || loading}>
        {loading ? 'Processing…' : `Pay £${totalPrice} Now →`}
      </button>

      <div className="co-secure-note">
        By paying you agree to our{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a>
        {' '}and{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
      </div>

      <div className="co-trust-row">
        <span style={{ fontSize: 13, color: '#a09bff' }}>🔒</span>
        <span className="co-trust-row-text">256-bit SSL · Secured by</span>
        <span className="co-trust-row-brand">Stripe</span>
      </div>

      <button type="button" className="co-back-btn" onClick={onBack}>
        ← Back to delivery
      </button>
    </form>
  );
}
