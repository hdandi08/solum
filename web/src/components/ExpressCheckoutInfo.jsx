import './ExpressCheckoutInfo.css';

export function ExpressCheckoutIntro() {
  return (
    <div className="express-checkout-intro">
      <h2>Express checkout</h2>
      <p>Use your saved payment and delivery details.</p>
    </div>
  );
}

export function CheckoutDispatch({ dispatch }) {
  if (!(dispatch instanceof Date) || Number.isNaN(dispatch.getTime())) return null;
  const isoDate = `${dispatch.getFullYear()}-${String(dispatch.getMonth() + 1).padStart(2, '0')}-${String(dispatch.getDate()).padStart(2, '0')}`;
  return (
    <p className="checkout-dispatch" data-testid="checkout-dispatch">
      Ships <time dateTime={isoDate}>{dispatch.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</time>
    </p>
  );
}

export function ExpressCheckoutConsent() {
  return (
    <p className="by-express-consent">
      By continuing with express checkout, you agree to our{' '}
      <a href="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a>
      {' '}and{' '}
      <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
    </p>
  );
}
