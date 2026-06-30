import { useState, useEffect, useRef, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { KITS } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';
import { offerActive } from '../lib/offer.js';
import { capture, identify, fbViewContent, fbInitiateCheckout, ttqViewContent, ttqAddPaymentInfo, ttqPlaceAnOrder, ttqInitiateCheckout, ttqIdentify } from '../lib/analytics.js';
import { trackAddToCart } from '../lib/addToCartTracker.js';
import SolumWordmark from '../components/SolumWordmark.jsx';
import FounderChat from '../components/FounderChat.jsx';
import TrustBar from '../components/TrustBar.jsx';
import './checkout/checkout.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STRIPE_KEY   = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

const stripePromise = loadStripe(STRIPE_KEY);

const KIT_PRICES = { ground: 65, ritual: 85 };

const stripeAppearance = {
  theme: 'night',
  variables: {
    colorPrimary:            '#4A8FC7',
    colorBackground:         '#08090B',
    colorText:               '#F0ECE2',
    colorTextSecondary:      'rgba(168,180,188,0.8)',
    colorDanger:             '#e05c5c',
    colorIconTab:            '#F0ECE2',
    colorIconTabSelected:    '#F0ECE2',
    colorIconTabHover:       '#F0ECE2',
    fontFamily:              '"Barlow Condensed", system-ui, sans-serif',
    fontSizeBase:            '16px',
    borderRadius:            '0px',
    spacingUnit:             '5px',
  },
  rules: {
    '.Input': { border: '1px solid rgba(240,236,226,0.15)', backgroundColor: '#08090B', padding: '14px 16px' },
    '.Input:focus': { border: '1px solid #4A8FC7', boxShadow: 'none', outline: 'none' },
    '.Label': { fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '600', color: 'rgba(168,180,188,0.9)', marginBottom: '7px' },
    '.Tab': { border: '1px solid rgba(240,236,226,0.15)', backgroundColor: '#08090B' },
    '.Tab--selected': { border: '1px solid #4A8FC7', backgroundColor: '#0d1520' },
    '.TabLabel': { color: '#F0ECE2' },
    '.TabLabel--selected': { color: '#F0ECE2' },
  },
};

function isValidUKPhone(raw) {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  const digits  = cleaned.replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) return false;
  if (digits.startsWith('44')) return digits.length === 12;
  if (digits.startsWith('0'))  return digits.length === 11;
  return false;
}

// ── Inline CSS — kit selector only (everything else reuses checkout.css) ──────

const CSS = `
.by-express-wrap{margin-bottom:8px;}
.by-express-or{display:flex;align-items:center;gap:14px;margin:18px 0 22px;color:var(--stone);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;}
.by-express-or::before,.by-express-or::after{content:'';flex:1;height:1px;background:var(--line);}
.by-kits{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);margin-bottom:32px;}
@media(max-width:520px){.by-kits{grid-template-columns:1fr;}}
.by-kit{background:var(--black);padding:24px 20px;cursor:pointer;transition:background .15s;}
.by-kit:hover{background:var(--dark);}
.by-kit.selected{background:var(--dark);outline:2px solid var(--blue);}
.by-kit.soldout{opacity:.45;cursor:default;}
.by-kit-badge{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);font-weight:700;margin-bottom:8px;display:block;}
.by-kit-name{font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:.06em;line-height:1;margin-bottom:4px;color:var(--bone);}
.by-kit-tagline{font-size:12px;font-weight:300;color:var(--stone);line-height:1.4;margin-bottom:12px;}
.by-kit-price{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:-1px;line-height:1;color:var(--bone);}
.by-kit-price-label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);margin-top:2px;}
.by-kit-soldout-tag{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);margin-top:6px;}
.by-stock-pill{display:inline-flex;align-items:center;gap:8px;margin:12px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);border:1px solid rgba(46,109,164,0.35);padding:5px 10px;}
.by-stock-dot{width:5px;height:5px;border-radius:50%;background:var(--blit);animation:bydot 2s ease infinite;}
@keyframes bydot{0%,100%{opacity:1;}50%{opacity:.3;}}
.by-soldout-page{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);min-height:calc(100vh - 64px);align-items:start;padding-top:64px;}
.by-soldout-left{background:var(--black);padding:48px 40px;}
.by-soldout-right{background:var(--char);padding:48px 40px;display:flex;flex-direction:column;gap:0;}
.by-soldout-badge{display:inline-flex;align-items:center;gap:8px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#e05c5c;border:1px solid rgba(224,92,92,0.3);padding:5px 12px;margin-bottom:28px;font-weight:700;}
.by-soldout-badge-dot{width:6px;height:6px;border-radius:50%;background:#e05c5c;animation:bydot 1.5s ease infinite;}
.by-soldout-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(48px,6vw,76px);letter-spacing:.04em;color:var(--bone);line-height:.95;margin-bottom:16px;}
.by-soldout-kit{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:28px;}
.by-soldout-apology{border-left:2px solid #e05c5c;padding-left:18px;margin-bottom:28px;}
.by-soldout-apology-head{font-size:16px;color:var(--bone);font-weight:500;line-height:1.55;margin-bottom:6px;}
.by-soldout-apology-body{font-size:14px;color:var(--stone);font-weight:300;line-height:1.7;}
.by-soldout-saved{display:flex;align-items:flex-start;gap:14px;background:rgba(46,109,164,0.07);border:1px solid rgba(46,109,164,0.2);padding:18px 20px;margin-bottom:28px;}
.by-soldout-saved-tick{width:26px;height:26px;border-radius:50%;background:var(--blue);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;color:#fff;margin-top:2px;}
.by-soldout-saved-text{font-size:14px;color:var(--mist);font-weight:300;line-height:1.65;}
.by-soldout-saved-text strong{color:var(--bone);font-weight:600;display:block;margin-bottom:2px;}
.by-soldout-home{font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;color:var(--stone);text-decoration:none;border:1px solid var(--lineb);padding:13px 24px;text-align:center;transition:border-color .2s,color .2s;display:block;}
.by-soldout-home:hover{border-color:var(--bone);color:var(--bone);}
/* Founder card */
.by-founder-tag{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:24px;}
.by-founder-photo-wrap{position:relative;width:88px;height:88px;margin-bottom:20px;}
.by-founder-photo{width:88px;height:88px;border-radius:50%;object-fit:cover;object-position:center top;border:2px solid var(--blue);display:block;}
.by-founder-status{position:absolute;bottom:2px;right:2px;width:16px;height:16px;border-radius:50%;background:#22c55e;border:2px solid var(--char);}
.by-founder-name{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.06em;color:var(--bone);line-height:1;margin-bottom:4px;}
.by-founder-role{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:500;margin-bottom:24px;}
.by-founder-message{font-size:16px;color:var(--mist);font-weight:300;line-height:1.75;font-style:italic;border-left:2px solid var(--blue);padding-left:18px;margin-bottom:28px;}
.by-founder-message em{font-style:normal;color:var(--bone);font-weight:500;}
.by-founder-sig{font-size:13px;color:var(--stone);font-weight:400;margin-bottom:32px;letter-spacing:.3px;}
.by-ig-btn{display:flex;align-items:center;gap:12px;background:var(--black);border:1px solid var(--lineb);padding:14px 18px;text-decoration:none;transition:border-color .2s,background .2s;}
.by-ig-btn:hover{border-color:var(--blue);background:rgba(46,109,164,0.08);}
.by-ig-icon{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.by-ig-icon svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}
.by-ig-text{display:flex;flex-direction:column;gap:1px;}
.by-ig-handle{font-size:14px;color:var(--bone);font-weight:600;letter-spacing:.3px;}
.by-ig-sub{font-size:11px;color:var(--stone);font-weight:300;letter-spacing:.3px;}
@media(max-width:768px){
  .by-soldout-page{grid-template-columns:1fr;padding-top:64px;}
  .by-soldout-left,.by-soldout-right{padding:36px 24px;}
}
/* Kit-contents thumbnail hover-zoom (overrides checkout.css 32x40 defaults) */
.co-product-list .co-product-thumb,.co-product-list .co-product-thumb-ph{width:40px;height:52px;cursor:zoom-in;}
.co-product-preview-fixed{position:fixed;width:220px;height:275px;object-fit:cover;object-position:center;background:var(--dark);border:1px solid var(--line);box-shadow:0 12px 32px rgba(0,0,0,0.6);z-index:2000;pointer-events:none;}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDay(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getDispatchDate() {
  const now = new Date();
  const day = now.getDay();
  const isBeforeNoon = now.getHours() < 12;
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  const daysToAdd = { 1: 3, 2: 2, 4: 4, 5: 3, 6: 2 };
  if (day in daysToAdd) d.setDate(d.getDate() + daysToAdd[day]);
  else if (day === 3) d.setDate(d.getDate() + (isBeforeNoon ? 1 : 5));
  else d.setDate(d.getDate() + (isBeforeNoon ? 1 : 4));
  return d;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['details', 'delivery', 'payment'];
const STEP_LABELS = ['Details', 'Delivery', 'Payment'];

function ProgressBar({ step }) {
  const idx = STEPS.indexOf(step);
  return (
    <div className="co-progress">
      {STEPS.map((s, i) => (
        <Fragment key={s}>
          <div className={`co-progress-step${i === idx ? ' active' : i < idx ? ' done' : ''}`}>
            <div className="co-progress-dot">{i < idx ? '✓' : i + 1}</div>
            <div className="co-progress-label">{STEP_LABELS[i]}</div>
          </div>
          {i < STEPS.length - 1 && <div className="co-progress-line" />}
        </Fragment>
      ))}
    </div>
  );
}

// ── Mobile header (one-time, no subscription language) ────────────────────────

function BuyMobileHeader({ kit, price, dispatch, arrival, inventory }) {
  const [open, setOpen] = useState(false);
  const products = PRODUCTS.filter(p => kit.productNums.includes(p.num) && !p.comingSoon);
  const totalRemaining = (inventory?.ground?.count ?? 0) + (inventory?.ritual?.count ?? 0);

  return (
    <div className="co-mobile-header">
      <button
        className="co-mobile-header-bar"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        type="button"
      >
        <div className="co-mobile-header-left">
          <span className="co-mobile-kit-name">{kit.name}</span>
          <span className="co-mobile-see-more">
            {open ? '▴ Hide summary' : '▾ Order summary'}
          </span>
        </div>
        <div className="co-mobile-price-block">
          <span className="co-mobile-price">£{price}</span>
          <span className="co-mobile-price-note">one-time</span>
        </div>
      </button>

      {open && (
        <div className="co-mobile-header-body">
          <div className="co-mobile-dispatch">
            Ships {fmtDay(dispatch)} · Arrives {fmtDay(arrival)}
          </div>
          <div className="co-mobile-products">
            {products.map(p => (
              <div key={p.num} className="co-mobile-product">
                <span className="co-mobile-product-num">{p.num}</span>
                <span>{p.name}</span>
              </div>
            ))}
          </div>
          <div className="co-mobile-trust">
            <div className="co-mobile-trust-line">📦 Royal Mail Tracked 48 · {offerActive() ? <><s style={{ color: 'var(--stone)' }}>£5.95</s> <span style={{ color: '#4a8fc7', fontWeight: 600 }}>FREE</span></> : 'Free'} · UK only</div>
            <div className="co-mobile-trust-line">🔒 Secured by Stripe — encrypted end to end</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Checkout nav (SOLUM wordmark, fixed top) ─────────────────────────────────

function BuyCheckoutNav() {
  return (
    <nav className="co-checkout-nav">
      <SolumWordmark />
      <span className="co-checkout-nav-lock">
        <svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-hidden="true">
          <rect x="0.75" y="5.75" width="9.5" height="6.5" rx="0.75" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M3 5.5V3.5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Secure Checkout
      </span>
    </nav>
  );
}

// ── Desktop right panel ───────────────────────────────────────────────────────

function BuyOrderSummary({ kit, price, dispatch, arrival, inventory }) {
  const products = PRODUCTS.filter(p => kit.productNums.includes(p.num));
  const totalRemaining = (inventory?.ground?.count ?? 0) + (inventory?.ritual?.count ?? 0);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });

  const showPreview = (e, src) => {
    if (!src) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const previewW = 220;
    const previewH = 275;
    // Place the preview above the thumb so it never covers the product name
    // (which sits to the right of the thumb on the same row).
    const left = Math.min(window.innerWidth - previewW - 12, Math.max(12, rect.left));
    const top = Math.max(12, rect.top - previewH - 12);
    setPreviewPos({ top, left });
    setPreviewSrc(src);
  };
  const hidePreview = () => setPreviewSrc(null);

  return (
    <div className="co-right">
      <div className="co-kit-name">{kit.name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
        <span className="co-price-main">£{price}</span>
        <span className="co-price-label">one-time</span>
      </div>
      <div className="co-price-sub">Ships {fmtDay(dispatch)} · Arrives {fmtDay(arrival)}</div>
      {offerActive() ? (
        <div className="co-price-sub" style={{ marginTop: 3 }}>
          Royal Mail Tracked 48 · <s style={{ color: 'var(--stone)' }}>£5.95</s>{' '}
          <span style={{ color: '#2E6DA4', fontWeight: 600 }}>FREE</span> · UK only
        </div>
      ) : (
        <div className="co-price-sub" style={{ marginTop: 3 }}>Royal Mail Tracked 48 · Free · UK only</div>
      )}

      <div className="co-divider" />

      <div className="co-promise">
        <div className="co-promise-title">Before You Buy</div>
        <div className="co-promise-item">
          <span className="co-promise-check">◆</span>
          <span>Ships {fmtDay(dispatch)} · Arrives {fmtDay(arrival)}</span>
        </div>
        <div className="co-promise-item">
          <span className="co-promise-check">◆</span>
          <span>Ritual guide included in the box — QR code to bysolum.co.uk/ritual</span>
        </div>
        <div className="co-promise-item">
          <span className="co-promise-check">◆</span>
          <span>Secured by Stripe — your card details never touch our servers</span>
        </div>
      </div>

      <div className="co-divider" />

      <div className="co-panel-label">What's in your box</div>
      <div className="co-product-list">
        {products.map(p => (
          <div key={p.num} className={`co-product${p.comingSoon ? ' dimmed' : ''}`}>
            {p.media?.still
              ? (
                <img
                  src={p.media.still}
                  alt={p.name}
                  className="co-product-thumb"
                  loading="lazy"
                  onMouseEnter={(e) => showPreview(e, p.media.still)}
                  onMouseLeave={hidePreview}
                />
              )
              : <div className="co-product-thumb-ph" />
            }
            <span className="co-product-num">{p.num}</span>
            <span>{p.name}{p.comingSoon ? ' *' : ''}</span>
          </div>
        ))}
      </div>
      {products.some(p => p.comingSoon) && (
        <div className="co-soon-note">* Coming soon — included when available</div>
      )}
      {previewSrc && (
        <img
          src={previewSrc}
          alt=""
          aria-hidden="true"
          className="co-product-preview-fixed"
          style={{ top: previewPos.top, left: previewPos.left }}
        />
      )}
    </div>
  );
}

// ── Step 3: Payment ───────────────────────────────────────────────────────────

function StepPayment({ activeKit, price, payInfo, form, source, onBack, onEditDetails }) {
  const stripe     = useStripe();
  const elements   = useElements();
  const submitting = useRef(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [paymentType, setPaymentType]     = useState('card');
  const [termsAccepted, setTermsAccepted] = useState(false);

  async function handlePay(e) {
    e.preventDefault();
    if (!stripe || !elements || submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');

    try {
      const successParams = new URLSearchParams({
        kit:      activeKit.id,
        source,
        dispatch: payInfo.dispatch_date ?? '',
        arrival:  payInfo.arrival_date  ?? '',
        amount:   String(payInfo.amount_pence),
      });

      const piId = payInfo.client_secret?.split('_secret_')[0];
      ttqPlaceAnOrder(activeKit.id, activeKit.name, payInfo.amount_pence / 100, piId);

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/success?${successParams.toString()}`,
          payment_method_data: {
            billing_details: {
              name:    [form.first_name, form.last_name].filter(Boolean).join(' ') || undefined,
              email:   form.email   || undefined,
              phone:   form.phone   || undefined,
              address: {
                line1:       form.line1    || undefined,
                line2:       form.line2    || undefined,
                city:        form.city     || undefined,
                postal_code: form.postcode || undefined,
                state:       form.county   || null,
                country:     'GB',
              },
            },
          },
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message ?? 'Payment failed. Please try again.');
      } else if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        successParams.set('ref', paymentIntent.id);
        window.location.href = `/success?${successParams.toString()}`;
        return;
      } else {
        setError('Something went wrong. Please try again or contact contact@bysolum.co.uk.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again or contact contact@bysolum.co.uk.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handlePay} noValidate>
      <div className="co-step-heading">Payment.</div>
      <div className="co-step-subhead">Your card details are encrypted — never stored on our servers.</div>

      <div className="co-email-confirm">
        <span className="co-email-confirm-label">Paying as</span>
        <span className="co-email-confirm-value">{form.email}</span>
        <button type="button" className="co-email-confirm-edit" onClick={onEditDetails}>Wrong? Edit ›</button>
      </div>

      <div className="co-order-pill">
        <div className="co-order-pill-kit">{activeKit.name} · One-Time Kit</div>
        <div className="co-order-pill-charge-row">
          <span className="co-order-pill-charge-label">Charged today</span>
          <span className="co-order-pill-charge-amount">£{price}</span>
        </div>
        <div className="co-order-pill-detail">
          Ships {payInfo.dispatch_date} · Arrives {payInfo.arrival_date}
        </div>
      </div>

      <div className="co-payment-element-wrap">
        <PaymentElement
          onChange={(e) => setPaymentType(e.value?.type ?? 'card')}
          options={{
            layout: 'tabs',
            fields: { billingDetails: 'never' },
          }}
        />
      </div>

      {error && <div className="co-error" data-testid="pay-error">{error}</div>}

      <label className="co-terms-check">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={e => setTermsAccepted(e.target.checked)}
        />
        <span>
          I agree to the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a>
          {' '}and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        </span>
      </label>

      <button type="submit" className="co-submit" disabled={!stripe || !elements || loading || !termsAccepted} data-testid="pay-btn">
        {loading ? 'Processing…' : `Pay £${price} Now →`}
      </button>

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

// ── Express Checkout (Apple Pay / Google Pay / Link) ──────────────────────────
// Deferred PaymentIntent flow: wallet supplies email + shipping address, then we
// create the PI server-side (existing function) and confirm. One tap, no form.

function ExpressCheckout({ kitId, price, source, authHeaders, onError, onAvailability }) {
  const stripe = useStripe();
  const elements = useElements();

  async function onConfirm(event) {
    if (!stripe || !elements) return;
    onError('');
    const { error: submitError } = await elements.submit();
    if (submitError) { onError(submitError.message ?? 'Could not start payment.'); return; }

    const ship   = event.shippingAddress ?? {};
    const addr    = ship.address ?? {};
    const billing = event.billingDetails ?? {};
    const fullName = (ship.name || billing.name || '').trim();
    const [first_name, ...rest] = fullName.split(/\s+/);
    const last_name = rest.join(' ') || null;
    const email = (billing.email || '').trim().toLowerCase();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-first-box-payment-intent`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kit_id:     kitId,
          email,
          first_name: first_name || (fullName || 'Customer'),
          last_name,
          phone:      billing.phone || null,
          source,
          site_host:  window.location.hostname,
          line1:      addr.line1 || '',
          line2:      addr.line2 || null,
          city:       addr.city || '',
          county:     addr.state || null,
          postcode:   addr.postal_code || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) { onError(data.message ?? data.error ?? 'Something went wrong. Please try again.'); return; }

      identify(email, { first_name: first_name || '', kit: kitId, source });
      capture('checkout_initiated', { kit: kitId, source, price, method: 'express' });
      fbInitiateCheckout(kitId, price);
      try { sessionStorage.setItem('solum_buyer_email', email); } catch {}

      const successParams = new URLSearchParams({
        kit: kitId, source,
        dispatch: data.dispatch_date ?? '', arrival: data.arrival_date ?? '',
        amount: String(data.amount_pence),
      });

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: data.client_secret,
        confirmParams: { return_url: `${window.location.origin}/success?${successParams.toString()}` },
        redirect: 'if_required',
      });

      if (confirmError) { onError(confirmError.message ?? 'Payment failed. Please try again.'); return; }
      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        successParams.set('ref', paymentIntent.id);
        window.location.href = `/success?${successParams.toString()}`;
      }
    } catch {
      onError('Network error. Please try again.');
    }
  }

  return (
    <ExpressCheckoutElement
      options={{
        buttonHeight: 48,
        paymentMethods: {
          applePay: 'auto', googlePay: 'auto', link: 'auto',
          amazonPay: 'never', klarna: 'never', paypal: 'never',
        },
      }}
      onReady={({ availablePaymentMethods }) => onAvailability(!!availablePaymentMethods)}
      onClick={({ resolve }) => resolve({
        emailRequired: true,
        shippingAddressRequired: true,
        phoneNumberRequired: false,
        allowedShippingCountries: ['GB'],
      })}
      onConfirm={onConfirm}
      onCancel={() => {}}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BuyPage() {
  const [params] = useSearchParams();

  const rawSource = params.get('source');
  const source    = rawSource === 'tiktok' ? 'tiktok_shop' : (rawSource ?? 'first_batch');
  const preselect = params.get('kit');
  const isFirstBatch = source === 'first_batch';

  const [inventory, setInventory]       = useState(null);
  const [selectedKit, setSelectedKit]   = useState(preselect ?? 'ritual');
  const [step, setStep]                 = useState('details'); // details | delivery | payment | soldout
  const [form, setForm]                 = useState({ first_name: '', last_name: '', email: '', phone: '', line1: '', line2: '', city: '', county: '', postcode: '' });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const [payInfo, setPayInfo]           = useState(null);
  const [soldoutSaved, setSoldoutSaved] = useState(false);
  const [expressAvailable, setExpressAvailable] = useState(false);

  const authHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

  // Restore state after a failed redirect-based payment (Revolut Pay etc.)
  useEffect(() => {
    if (params.get('resume') !== '1') return;
    try {
      const saved = JSON.parse(sessionStorage.getItem('solum_payment_retry') ?? '{}');
      if (!saved.clientSecret || !saved.form) return;
      setForm(saved.form);
      setPayInfo(saved.payInfo);
      setClientSecret(saved.clientSecret);
      if (saved.kit) setSelectedKit(saved.kit);
      setStep('payment');
      window.scrollTo(0, 0);
      sessionStorage.removeItem('solum_payment_retry');
    } catch {}
  }, []); // eslint-disable-line

  // Always open the buy flow at the top, regardless of the scroll position it was clicked from.
  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    capture('buy_page_viewed', { source, preselect: preselect ?? 'none' });
    fbViewContent(preselect ?? 'ground');
    ttqViewContent(preselect ?? 'ground', 'SOLUM Kit', 65);
  }, []); // eslint-disable-line

  useEffect(() => {
    fetch(`${SUPABASE_URL}/functions/v1/get-inventory-status`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => setInventory(d.kits ?? {}))
      .catch(() => setInventory({}));
  }, []); // eslint-disable-line

  const dispatch = getDispatchDate();
  const arrival  = addDays(dispatch, 2);

  const activeKit = KITS.find(k => k.id === selectedKit) ?? KITS.find(k => k.id === 'ritual');
  const price     = KIT_PRICES[selectedKit] ?? KIT_PRICES.ritual;

  function onChange(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  // ── Step 1: details validation ────────────────────────────────────────────

  async function handleDetailsNext(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!form.first_name.trim()) { setError('First name is required.'); return; }
    const emailVal = form.email.trim();
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setError('Please enter a valid email address.'); return;
    }
    if (form.phone.trim() && !isValidUKPhone(form.phone)) {
      setError('Please enter a valid UK phone number (e.g. 07700 900000 or +44 7700 900000).'); return;
    }

    // MX record check — catches typos like gmail.con, hotmal.com etc.
    setLoading(true);
    try {
      const domain = emailVal.split('@')[1];
      const dnsRes = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
        { headers: { Accept: 'application/dns-json' } },
      );
      const dns = await dnsRes.json();
      if (dns.Status === 3 || !dns.Answer?.length) {
        setError(`We couldn't find a mail server for ${domain}. Please double-check your email.`);
        setLoading(false); return;
      }
    } catch { /* allow through if DNS lookup fails */ }
    setLoading(false);

    const kitSoldOut = inventory !== null && !inventory[selectedKit]?.available;
    if (kitSoldOut) {
      setLoading(true);
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/join-waitlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
          body: JSON.stringify({
            email:      emailVal.toLowerCase(),
            first_name: form.first_name.trim() || null,
            last_name:  form.last_name.trim()  || null,
            phone:      form.phone.trim()      || null,
            source:     `buy-soldout-${selectedKit}`,
          }),
        });
        setSoldoutSaved(true);
      } catch {
        setSoldoutSaved(false);
      }
      capture('soldout_detected', { kit: selectedKit, source });
      setStep('soldout');
      window.scrollTo(0, 0);
      setLoading(false);
      return;
    }

    capture('checkout_details_submitted', { kit: selectedKit, source });
    setStep('delivery');
    window.scrollTo(0, 0);
  }

  // ── Step 2: delivery → create payment intent ──────────────────────────────

  async function handleDeliveryNext(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!form.line1.trim()) { setError('Address line 1 is required.'); return; }
    if (!form.city.trim())  { setError('City is required.'); return; }
    if (!form.postcode.trim()) { setError('Postcode is required.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-first-box-payment-intent`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kit_id:     selectedKit,
          email:      form.email.trim().toLowerCase(),
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim() || null,
          phone:      form.phone.trim() || null,
          source,
          site_host:  window.location.hostname,
          line1:      form.line1.trim(),
          line2:      form.line2.trim() || null,
          city:       form.city.trim(),
          county:     form.county.trim() || null,
          postcode:   form.postcode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      identify(form.email.trim().toLowerCase(), { first_name: form.first_name.trim(), kit: selectedKit, source });
      capture('checkout_delivery_submitted', { kit: selectedKit, source });
      capture('checkout_initiated', { kit: selectedKit, source, price, method: 'standard' });
      fbInitiateCheckout(selectedKit, price);
      ttqIdentify(form.email.trim().toLowerCase());
      ttqInitiateCheckout(selectedKit, activeKit?.name ?? selectedKit, price);
      ttqAddPaymentInfo(selectedKit, activeKit?.name ?? selectedKit, price);
      try { sessionStorage.setItem('solum_buyer_email', form.email.trim().toLowerCase()); } catch {}

      setClientSecret(data.client_secret);
      setPayInfo(data);
      setStep('payment');
      window.scrollTo(0, 0);
      try {
        sessionStorage.setItem('solum_payment_retry', JSON.stringify({
          clientSecret: data.client_secret, payInfo: data, form, kit: selectedKit, source,
        }));
      } catch {}
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Shared header + summary props ─────────────────────────────────────────

  const headerProps = { kit: activeKit, price, dispatch, arrival, inventory };

  // ── Render ────────────────────────────────────────────────────────────────

  if (step === 'soldout') {
    return (
      <>
        <style>{CSS}</style>
        <BuyCheckoutNav />
        <div className="by-soldout-page">
          {/* Left — apology */}
          <div className="by-soldout-left">
            <div className="by-soldout-badge">
              <span className="by-soldout-badge-dot" />
              Sold Out
            </div>
            <div className="by-soldout-title">Oh No.<br />We're Sorry.</div>
            <div className="by-soldout-kit">
              SOLUM {activeKit?.name} — {activeKit?.firstBoxPrice ? `£${activeKit.firstBoxPrice}` : ''} · One-Time Kit
            </div>
            <div className="by-soldout-apology">
              <div className="by-soldout-apology-head">
                You got this far and we let you down. This kit has sold out.
              </div>
              <div className="by-soldout-apology-body">
                The first batch went faster than expected. We are working on the next restock now.
                You will be the first to know the moment it is back.
              </div>
            </div>
            <div className="by-soldout-saved">
              <div className="by-soldout-saved-tick">✓</div>
              <div className="by-soldout-saved-text">
                <strong>You're on the list.</strong>
                We've saved your details and will email {form.email} the moment stock is back. No action needed.
              </div>
            </div>
            <a href="/" className="by-soldout-home">← Back to bysolum.co.uk</a>
          </div>

          {/* Right — founder card */}
          <div className="by-soldout-right">
            <div className="by-founder-tag">From the Founder</div>
            <div className="by-founder-photo-wrap">
              <img src="/harsha.jpg" alt="Harsha, Founder of SOLUM" className="by-founder-photo" />
              <span className="by-founder-status" />
            </div>
            <div className="by-founder-name">Harsha</div>
            <div className="by-founder-role">Founder · SOLUM</div>
            <div className="by-founder-message">
              "I'm genuinely sorry. You did everything right and we ran out. I built SOLUM because I believe
              in what it does — and running out of stock on people who want it is the worst feeling.
              I'm personally working on the restock. <em>You will hear from me the moment it's ready.</em>"
            </div>
            <div className="by-founder-sig">— Harsha · harsha@bysolum.co.uk</div>
            <a
              href="https://instagram.com/bysolum.body"
              target="_blank"
              rel="noopener noreferrer"
              className="by-ig-btn"
            >
              <span className="by-ig-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="5"/>
                  <circle cx="17.5" cy="6.5" r="1.5" fill="#fff" stroke="none"/>
                </svg>
              </span>
              <span className="by-ig-text">
                <span className="by-ig-handle">@bysolum.body</span>
                <span className="by-ig-sub">Follow for restock updates</span>
              </span>
            </a>
          </div>
        </div>
      </>
    );
  }

  if (step === 'payment' && clientSecret) {
    return (
      <>
        <style>{CSS}</style>
        <BuyCheckoutNav />
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
          <div className="co-page">
            <div className="co-left">
              <BuyMobileHeader {...headerProps} />
              <a className="co-back-btn" href="/#kits" style={{ marginTop: 0, marginBottom: 20 }}>
                ← Back to kits
              </a>
              <ProgressBar step="payment" />
              <StepPayment
                activeKit={activeKit}
                price={price}
                payInfo={payInfo}
                form={form}
                source={source}
                onBack={() => { setStep('delivery'); window.scrollTo(0, 0); }}
                onEditDetails={() => { setStep('details'); window.scrollTo(0, 0); }}
              />
            </div>
            <BuyOrderSummary {...headerProps} />
          </div>
        </Elements>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <BuyCheckoutNav />
      <TrustBar />
      <div className="co-page">
        <div className="co-left">
          <BuyMobileHeader {...headerProps} />
          <a className="co-back-btn" href="/#kits" style={{ marginTop: 0, marginBottom: 20 }}>
            ← Back to kits
          </a>

          <>
              <ProgressBar step={step} />

              {/* Kit selector — shown on step 1 only */}
              {step === 'details' && (
                <div className="by-kits" data-testid="kit-selector">
                  {(['ground', 'ritual']).map(id => {
                    const kit = KITS.find(k => k.id === id);
                    return (
                      <div
                        key={id}
                        data-testid={`kit-${id}`}
                        className={`by-kit${selectedKit === id ? ' selected' : ''}`}
                        onClick={() => { setSelectedKit(id); trackAddToCart(id); }}
                      >
                        {kit?.popular && <span className="by-kit-badge">Most Popular</span>}
                        <div className="by-kit-name">{kit?.name}</div>
                        <div className="by-kit-tagline">{kit?.tagline}</div>
                        <div className="by-kit-price">£{KIT_PRICES[id]}</div>
                        <div className="by-kit-price-label">one-time</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Express checkout — one-tap wallets, above the manual form */}
              {step === 'details' && (
                <div className="by-express-wrap">
                  <Elements
                    key={selectedKit}
                    stripe={stripePromise}
                    options={{ mode: 'payment', amount: price * 100, currency: 'gbp', appearance: stripeAppearance }}
                  >
                    <ExpressCheckout
                      kitId={selectedKit}
                      price={price}
                      source={source}
                      authHeaders={authHeaders}
                      onError={setError}
                      onAvailability={setExpressAvailable}
                    />
                  </Elements>
                  {expressAvailable && (
                    <div className="by-express-or"><span>or pay by card</span></div>
                  )}
                </div>
              )}

              {/* Step 1: Details */}
              {step === 'details' && (
                <form onSubmit={handleDetailsNext} noValidate data-testid="details-form">
                  <div className="co-step-heading">Your Details.</div>
                  <div className="co-step-subhead">Takes 60 seconds. We only ask what we need.</div>

                  <div className="co-row">
                    <div className="co-field">
                      <label className="co-label">First Name</label>
                      <input className="co-input" type="text" value={form.first_name} onChange={onChange('first_name')} placeholder="James" autoComplete="given-name" data-testid="first-name" />
                    </div>
                    <div className="co-field">
                      <label className="co-label">Last Name <span className="co-label-opt">optional</span></label>
                      <input className="co-input" type="text" value={form.last_name} onChange={onChange('last_name')} placeholder="Smith" autoComplete="family-name" />
                    </div>
                  </div>

                  <div className="co-field">
                    <label className="co-label">Email</label>
                    <input className="co-input" type="email" value={form.email} onChange={onChange('email')} placeholder="james@example.com" autoComplete="email" data-testid="email" />
                  </div>

                  <div className="co-field">
                    <label className="co-label">Phone <span className="co-label-opt">optional · for delivery updates</span></label>
                    <input className="co-input" type="tel" value={form.phone} onChange={onChange('phone')} placeholder="+44 7700 900000" autoComplete="tel" data-testid="phone" />
                  </div>

                  {error && <div className="co-error" data-testid="form-error">{error}</div>}

                  <button className="co-submit" type="submit" disabled={loading} data-testid="continue-btn">
                    {loading ? 'Saving…' : 'Next: Delivery →'}
                  </button>

                  <div className="co-inline-trust">
                    <div className="co-inline-trust-item">
                      <span>🔒</span>
                      <span>Your information is encrypted and never sold</span>
                    </div>
                  </div>
                </form>
              )}

              {/* Step 2: Delivery */}
              {step === 'delivery' && (
                <form onSubmit={handleDeliveryNext} noValidate data-testid="delivery-form">
                  <div className="co-step-heading">Delivery.</div>
                  <div className="co-step-subhead">UK delivery only · Royal Mail Tracked 48 · Free shipping</div>

                  <div className="co-field">
                    <label className="co-label">Address Line 1</label>
                    <input className="co-input" type="text" value={form.line1} onChange={onChange('line1')} placeholder="14 Example Street" autoComplete="address-line1" data-testid="line1" />
                  </div>
                  <div className="co-field">
                    <label className="co-label">Address Line 2 <span className="co-label-opt">optional</span></label>
                    <input className="co-input" type="text" value={form.line2} onChange={onChange('line2')} placeholder="Flat 2" autoComplete="address-line2" />
                  </div>
                  <div className="co-row">
                    <div className="co-field">
                      <label className="co-label">City / Town</label>
                      <input className="co-input" type="text" value={form.city} onChange={onChange('city')} placeholder="London" autoComplete="address-level2" data-testid="city" />
                    </div>
                    <div className="co-field">
                      <label className="co-label">Postcode</label>
                      <input className="co-input" type="text" value={form.postcode} onChange={onChange('postcode')} placeholder="SW1A 1AA" autoComplete="postal-code" style={{ textTransform: 'uppercase' }} data-testid="postcode" />
                    </div>
                  </div>
                  <div className="co-field">
                    <label className="co-label">County <span className="co-label-opt">optional</span></label>
                    <input className="co-input" type="text" value={form.county} onChange={onChange('county')} placeholder="Buckinghamshire" autoComplete="address-level1" />
                  </div>

                  <div className="co-ship-strip">
                    <span className="co-ship-strip-icon">📦</span>
                    <div className="co-ship-strip-text">
                      <span className="co-ship-strip-main">Ships {fmtDay(dispatch)} · Arrives {fmtDay(arrival)}</span>
                      <span className="co-ship-strip-sub">Royal Mail Tracked 48 · Free</span>
                    </div>
                  </div>

                  {error && <div className="co-error" data-testid="delivery-error">{error}</div>}

                  <button className="co-submit" type="submit" disabled={loading} data-testid="delivery-btn">
                    {loading ? 'Preparing payment…' : 'Continue to Payment →'}
                  </button>

                  <button type="button" className="co-back-btn" onClick={() => { setError(''); setStep('details'); window.scrollTo(0, 0); }}>
                    ← Back to your details
                  </button>
                </form>
              )}
            </>
        </div>

        <BuyOrderSummary {...headerProps} />
      </div>
      <FounderChat />
    </>
  );
}
