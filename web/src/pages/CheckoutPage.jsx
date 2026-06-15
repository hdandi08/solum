import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { KITS } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';
import tshirtImg from '../assets/solum-tshirt.jpeg';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STRIPE_KEY   = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Load Stripe once at module level
const stripePromise = loadStripe(STRIPE_KEY);

// Payment Element appearance — matches SOLUM dark aesthetic
const stripeAppearance = {
  theme: 'night',
  variables: {
    colorPrimary:     '#4A8FC7',
    colorBackground:  '#08090B',
    colorText:        '#F0ECE2',
    colorTextSecondary: 'rgba(168,180,188,0.8)',
    colorDanger:      '#e05c5c',
    fontFamily:       '"Barlow Condensed", system-ui, sans-serif',
    fontSizeBase:     '16px',
    borderRadius:     '0px',
    spacingUnit:      '5px',
  },
  rules: {
    '.Input': {
      border:          '1px solid rgba(240,236,226,0.15)',
      backgroundColor: '#08090B',
      padding:         '14px 16px',
    },
    '.Input:focus': {
      border:     '1px solid #4A8FC7',
      boxShadow:  'none',
      outline:    'none',
    },
    '.Label': {
      fontSize:       '13px',
      letterSpacing:  '2px',
      textTransform:  'uppercase',
      fontWeight:     '600',
      color:          'rgba(168,180,188,0.9)',
      marginBottom:   '7px',
    },
    '.Tab': {
      border:          '1px solid rgba(240,236,226,0.15)',
      backgroundColor: '#08090B',
    },
    '.Tab--selected': {
      border:          '1px solid #4A8FC7',
      backgroundColor: '#0d1520',
    },
  },
};

const CSS = `
.co-page{min-height:100vh;background:var(--black);display:grid;grid-template-columns:1fr 420px;gap:0;padding-top:64px;}
.co-left{padding:64px 56px 80px;border-right:1px solid var(--line);}
.co-right{padding:48px 40px;position:sticky;top:64px;align-self:start;height:calc(100vh - 64px);overflow-y:auto;background:var(--char);border-left:1px solid var(--lineb);}

/* Left — form */
.co-back{display:inline-flex;align-items:center;gap:8px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);text-decoration:none;margin-bottom:48px;transition:color .2s;}
.co-back:hover{color:var(--bone);}
.co-back-btn{background:none;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-family:'Barlow Condensed',sans-serif;font-weight:600;margin-bottom:48px;padding:0;transition:color .2s;}
.co-back-btn:hover{color:var(--bone);}
.co-eyebrow{font-size:13px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:12px;}
.co-heading{font-family:'Bebas Neue',sans-serif;font-size:clamp(42px,5vw,72px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:12px;}
.co-subhead{font-size:16px;color:var(--stone);font-weight:300;margin-bottom:48px;line-height:1.5;}
.co-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.co-field{display:flex;flex-direction:column;gap:7px;margin-bottom:20px;}
.co-label{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.co-input{background:var(--dark);border:1px solid var(--lineb);color:var(--bone);padding:14px 16px;font-family:'Barlow Condensed',sans-serif;font-size:16px;outline:none;transition:border-color .2s;width:100%;box-sizing:border-box;}
.co-input:focus{border-color:var(--blue);}
.co-input::placeholder{color:rgba(168,180,188,0.5);}
.co-submit{width:100%;background:var(--bone);color:var(--black);border:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.15em;padding:18px;cursor:pointer;transition:background .2s,transform .15s;margin-top:8px;}
.co-submit:hover:not(:disabled){background:#fff;transform:translateY(-1px);}
.co-submit:disabled{background:var(--stone);cursor:wait;transform:none;}
.co-secure{font-size:13px;color:var(--stone);font-weight:300;margin-top:14px;text-align:center;}
.co-terms-check{display:flex;align-items:flex-start;gap:10px;margin-top:20px;cursor:pointer;}
.co-terms-check input[type="checkbox"]{width:16px;height:16px;margin-top:2px;flex-shrink:0;accent-color:var(--blue);cursor:pointer;}
.co-terms-check span{font-size:13px;color:var(--stone);font-weight:300;line-height:1.5;}
.co-terms-check a{color:var(--mist);text-decoration:underline;}
.co-error{font-size:14px;color:#e05c5c;margin-top:14px;line-height:1.5;padding:12px 16px;border:1px solid rgba(224,92,92,0.3);background:rgba(224,92,92,0.05);}
.co-section-divider{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;margin:32px 0 24px;padding-bottom:10px;border-bottom:1px solid var(--line);}

/* Payment step */
.co-order-pill{background:rgba(46,109,164,0.12);border:1px solid rgba(74,143,199,0.3);padding:16px 20px;margin-bottom:32px;}
.co-order-pill-kit{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:6px;}
.co-order-pill-price{font-size:18px;color:var(--bone);font-weight:500;}
.co-order-pill-sub{font-size:13px;color:var(--stone);font-weight:300;margin-top:3px;}
.co-payment-element-wrap{margin-bottom:24px;}
.co-trust-badge{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:20px;padding:10px 16px;border:1px solid rgba(99,91,255,0.2);background:rgba(99,91,255,0.04);}
.co-trust-badge-text{font-size:12px;color:var(--stone);font-weight:300;letter-spacing:.5px;}
.co-trust-badge-brand{font-size:13px;font-weight:700;letter-spacing:-.5px;color:#a09bff;}

/* Stripe badge (form step) */
.co-stripe-badge{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:16px;padding:12px 16px;border:1px solid rgba(99,91,255,0.2);background:rgba(99,91,255,0.04);}
.co-stripe-lock{font-size:13px;color:#a09bff;}
.co-stripe-text{font-size:12px;color:var(--stone);font-weight:300;letter-spacing:.5px;}
.co-stripe-logo{font-size:13px;font-weight:700;letter-spacing:-.5px;color:#a09bff;}

/* Loading overlay */
.co-overlay{position:fixed;inset:0;z-index:999;background:var(--black);display:flex;align-items:center;justify-content:center;padding:24px;animation:coFadeIn .3s ease;}
@keyframes coFadeIn{from{opacity:0}to{opacity:1}}
.co-overlay-inner{max-width:560px;width:100%;display:flex;flex-direction:column;align-items:center;text-align:center;gap:0;}
.co-overlay-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:20px;}
.co-overlay-img{width:100%;max-width:380px;display:block;margin-bottom:32px;object-fit:cover;}
.co-overlay-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(48px,8vw,72px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:12px;}
.co-overlay-title em{font-style:normal;color:var(--blit);}
.co-overlay-rule{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);font-weight:600;border-left:2px solid var(--blue);padding-left:14px;margin-bottom:28px;line-height:1.6;text-align:left;}
.co-overlay-body{font-size:16px;font-weight:300;color:var(--mist);line-height:1.75;margin-bottom:36px;}
.co-overlay-spinner{display:flex;align-items:center;gap:12px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
.co-overlay-dot{width:6px;height:6px;border-radius:50%;background:var(--blue);animation:coPulse 1.2s ease-in-out infinite;}
.co-overlay-dot:nth-child(2){animation-delay:.2s;}
.co-overlay-dot:nth-child(3){animation-delay:.4s;}
@keyframes coPulse{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}

/* Right — kit summary */
.co-kit-name{font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:.05em;color:var(--bone);line-height:1;margin-bottom:4px;}
.co-price-main{font-family:'Bebas Neue',sans-serif;font-size:56px;color:var(--bone);letter-spacing:-1px;line-height:1;}
.co-price-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);margin-left:4px;}
.co-price-sub{font-size:16px;color:var(--mist);font-weight:300;margin-top:4px;}
.co-price-refill{font-size:13px;color:var(--stone);font-weight:300;margin-top:3px;letter-spacing:.3px;}
.co-divider{width:100%;height:1px;background:var(--line);margin:24px 0;}
.co-section-label{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:14px;}
.co-product-list{display:flex;flex-direction:column;gap:9px;margin-bottom:4px;}
.co-product{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--mist);font-weight:300;}
.co-product-num{font-size:10px;letter-spacing:2px;color:var(--blue);font-weight:600;min-width:22px;}
.co-product-thumb{width:32px;height:40px;object-fit:cover;object-position:center;background:var(--dark);border:1px solid var(--line);flex-shrink:0;}
.co-product-thumb-placeholder{width:32px;height:40px;background:var(--dark);border:1px solid var(--line);flex-shrink:0;}
.co-product.dimmed{opacity:.45;}
.co-soon-note{font-size:12px;color:var(--stone);font-style:italic;margin-top:6px;}

/* Our Promise block */
.co-promise{border:1px solid var(--lineb);padding:20px 20px 16px;}
.co-promise-title{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.co-trust{display:flex;flex-direction:column;gap:0;}
.co-trust-line{display:flex;align-items:flex-start;gap:12px;font-size:14px;color:var(--mist);font-weight:300;line-height:1.4;padding:10px 0;border-bottom:1px solid var(--line);}
.co-trust-line:last-child{border-bottom:none;padding-bottom:0;}
.co-trust-check{color:var(--blue);font-size:12px;flex-shrink:0;margin-top:2px;font-weight:700;}

/* Upgrade nudge */
.co-upgrade{border:1px solid rgba(200,169,110,0.35);background:rgba(200,169,110,0.06);padding:18px 20px;margin-bottom:24px;}
.co-upgrade-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#c8a96e;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px;}
.co-upgrade-star{font-size:13px;}
.co-upgrade-copy{font-size:13px;color:var(--mist);font-weight:300;line-height:1.55;margin-bottom:12px;}
.co-upgrade-copy strong{color:var(--bone);font-weight:500;}
.co-upgrade-link{font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:var(--bone);text-decoration:none;border-bottom:1px solid rgba(240,236,226,0.3);padding-bottom:2px;transition:border-color .2s;}
.co-upgrade-link:hover{border-color:var(--bone);}

/* Interstitial overlays */
.co-step{position:fixed;inset:0;z-index:999;background:rgba(8,9,11,0.94);backdrop-filter:blur(24px) brightness(0.4);-webkit-backdrop-filter:blur(24px) brightness(0.4);display:flex;align-items:center;justify-content:center;padding:24px;animation:coFadeIn .25s ease;}
.co-step-inner{max-width:580px;width:100%;position:relative;}
.co-step-close{position:absolute;top:-8px;right:0;background:none;border:none;color:var(--stone);font-size:22px;cursor:pointer;padding:4px 8px;line-height:1;transition:color .2s;}
.co-step-close:hover{color:var(--bone);}
.co-step-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:24px;}
.co-step-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(44px,7vw,72px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:16px;}
.co-step-title em{font-style:normal;color:var(--blit);}
.co-step-body{font-size:16px;font-weight:300;color:var(--mist);line-height:1.7;margin-bottom:12px;}
.co-step-perks{display:flex;flex-direction:column;gap:0;margin-bottom:36px;border:1px solid var(--lineb);}
.co-step-perk{font-size:14px;color:var(--mist);font-weight:300;padding:12px 16px;border-bottom:1px solid var(--lineb);line-height:1.4;}
.co-step-perk:last-child{border-bottom:none;}
.co-step-perk strong{color:var(--bone);font-weight:500;}
.co-step-actions{display:flex;flex-direction:column;gap:12px;}
.co-step-yes{background:var(--bone);color:var(--black);border:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.12em;padding:18px 32px;cursor:pointer;transition:background .2s;width:100%;}
.co-step-yes:hover{background:#fff;}
.co-step-no{background:none;border:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);cursor:pointer;padding:8px;transition:color .2s;font-family:'Barlow Condensed',sans-serif;font-weight:600;}
.co-step-no:hover{color:var(--mist);}
.co-step-back{background:none;border:none;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);cursor:pointer;padding:8px 0 0;transition:color .2s;font-family:'Barlow Condensed',sans-serif;font-weight:500;display:flex;align-items:center;gap:6px;}
.co-step-back:hover{color:var(--mist);}

/* Addon step */
.co-addon-step{border:1px solid var(--lineb);padding:24px;margin-bottom:32px;display:flex;gap:20px;align-items:flex-start;}
.co-addon-step-info{flex:1;}
.co-addon-step-name{font-size:18px;color:var(--bone);font-weight:500;margin-bottom:6px;}
.co-addon-step-desc{font-size:14px;color:var(--stone);font-weight:300;line-height:1.5;}
.co-addon-step-price{font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--bone);letter-spacing:.04em;flex-shrink:0;}

/* Waitlist */
.co-waitlist-block{border:1px solid rgba(46,109,164,0.35);background:rgba(46,109,164,0.05);padding:28px 28px 24px;}
.co-waitlist-eyebrow{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:#e05c5c;font-weight:600;margin-bottom:12px;}
.co-waitlist-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,5vw,52px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:10px;}
.co-waitlist-body{font-size:15px;color:var(--stone);font-weight:300;line-height:1.6;margin-bottom:28px;}
.co-waitlist-submit{width:100%;background:var(--blue);color:#fff;border:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.12em;padding:16px;cursor:pointer;transition:background .2s;margin-top:4px;}
.co-waitlist-submit:hover:not(:disabled){background:var(--blit);}
.co-waitlist-submit:disabled{opacity:.6;cursor:wait;}
.co-waitlist-done{text-align:center;padding:40px 28px;}
.co-waitlist-done-tick{font-size:36px;margin-bottom:16px;}
.co-waitlist-done-title{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.04em;color:var(--bone);margin-bottom:10px;}
.co-waitlist-done-body{font-size:15px;color:var(--stone);font-weight:300;line-height:1.6;}

@media(max-width:900px){
  .co-page{grid-template-columns:1fr;padding-top:64px;}
  .co-right{position:static;height:auto;border-left:none;border-bottom:1px solid var(--lineb);}
  .co-left{padding:40px 24px 64px;}
  .co-right{padding:32px 24px;}
}
`;

// ── Date helpers ──────────────────────────────────────────────────────────────

function getDispatchDate() {
  const now = new Date();
  const day = now.getDay();
  const isBeforeNoon = now.getHours() < 12;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const daysToAdd = { 1: 3, 2: 2, 4: 4, 5: 3, 6: 2 };
  if (day in daysToAdd) {
    d.setDate(d.getDate() + daysToAdd[day]);
  } else if (day === 3) {
    d.setDate(d.getDate() + (isBeforeNoon ? 1 : 5));
  } else {
    d.setDate(d.getDate() + (isBeforeNoon ? 1 : 4));
  }
  return d;
}

function getArrivalDate(dispatch) {
  const d = new Date(dispatch); d.setDate(d.getDate() + 2); return d;
}

function getFirstChargeDate() {
  const d = new Date(); d.setDate(d.getDate() + 30); d.setHours(0, 0, 0, 0); return d;
}

function getRefillShipDate(charge) {
  const d = new Date(charge); d.setDate(d.getDate() + 2); return d;
}

function getRefillArrivalDate(charge) {
  const d = new Date(charge); d.setDate(d.getDate() + 4); return d;
}

function fmtDay(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtDate(date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── PaymentStep — must live inside <Elements> context ─────────────────────────

function PaymentStep({ activeKit, payInfo, onBack }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

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
      // Unexpected state — shouldn't happen with redirect: 'if_required'
      setError('Something went wrong. Please try again or contact contact@bysolum.com.');
      setLoading(false);
    }
  }

  const totalPrice = (payInfo.amount_pence / 100).toFixed(0);

  return (
    <form onSubmit={handlePay} noValidate>
      <div className="co-order-pill">
        <div className="co-order-pill-kit">{activeKit.name} · First Box</div>
        <div className="co-order-pill-price">£{totalPrice} today</div>
        <div className="co-order-pill-sub">
          Ships {payInfo.dispatch_date} · Arrives {payInfo.arrival_date}
        </div>
        <div className="co-order-pill-sub" style={{ marginTop: 6 }}>
          Then £{payInfo.monthly_price}/mo from {payInfo.first_charge_date} — cancel any time
        </div>
      </div>

      <div className="co-payment-element-wrap">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && <div className="co-error">{error}</div>}

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

      <button type="submit" className="co-submit" disabled={!stripe || !elements || loading || !termsAccepted}>
        {loading ? 'Processing…' : `Pay £${totalPrice} Now →`}
      </button>

      <div className="co-trust-badge">
        <span style={{ fontSize: 13, color: '#a09bff' }}>🔒</span>
        <span className="co-trust-badge-text">256-bit SSL · Secured by</span>
        <span className="co-trust-badge-brand">Stripe</span>
      </div>

      <button type="button" className="co-back-btn" style={{ marginTop: 24, marginBottom: 0 }} onClick={onBack}>
        ← Back to your details
      </button>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const kitId      = params.get('kit');
  const kit        = KITS.find(k => k.id === kitId);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Form state
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    birth_year: '', birth_month: '',
    line1: '', line2: '', city: '', postcode: '',
  });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [checkoutStep, setCheckoutStep] = useState(null); // null | 'upgrade' | 'addon'

  // Payment stage
  const [checkoutStage, setCheckoutStage] = useState('form'); // 'form' | 'payment'
  const [clientSecret, setClientSecret]   = useState(null);
  const [payInfo, setPayInfo]             = useState(null);
  const [activeKitId, setActiveKitId]     = useState(kitId);

  // Inventory
  const [inventoryAvailable, setInventoryAvailable] = useState(null);

  // Waitlist
  const [waitlistForm, setWaitlistForm]   = useState({ first_name: '', last_name: '', email: '' });
  const [waitlistState, setWaitlistState] = useState('idle');

  useEffect(() => {
    fetch(`${SUPABASE_URL}/functions/v1/get-inventory-status`, {
      headers: { 'apikey': ANON_KEY },
    })
      .then(r => r.json())
      .then(data => {
        const available = data?.kits?.[kit.id];
        setInventoryAvailable(available !== false);
      })
      .catch(() => setInventoryAvailable(true));
  }, [kit?.id]); // eslint-disable-line

  if (!kit || kit.comingSoon) {
    navigate('/#kits');
    return null;
  }

  const activeKit  = KITS.find(k => k.id === activeKitId) ?? kit;
  const products   = PRODUCTS.filter(p => activeKit.productNums.includes(p.num));
  const ritualKit  = KITS.find(k => k.id === 'ritual');

  const dispatch     = getDispatchDate();
  const arrival      = getArrivalDate(dispatch);
  const firstCharge  = getFirstChargeDate();
  const refillShip   = getRefillShipDate(firstCharge);
  const refillArrive = getRefillArrivalDate(firstCharge);

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleWaitlist(e) {
    e.preventDefault();
    const emailVal = waitlistForm.email.trim();
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) return;
    setWaitlistState('submitting');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/join-waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({
          email: emailVal,
          first_name: waitlistForm.first_name.trim() || null,
          last_name: waitlistForm.last_name.trim() || null,
          kit_id: kit.id,
        }),
      });
      if (!res.ok) throw new Error();
      setWaitlistState('done');
    } catch {
      setWaitlistState('error');
    }
  }

  async function initiatePayment(kId, addons = []) {
    setCheckoutStep(null);
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          kit_id:      kId,
          email:       form.email.trim(),
          first_name:  form.first_name.trim(),
          last_name:   form.last_name.trim() || null,
          birth_year:  form.birth_year  ? parseInt(form.birth_year)  : null,
          birth_month: form.birth_month ? parseInt(form.birth_month) : null,
          phone:       form.phone.trim() || null,
          line1:       form.line1.trim(),
          line2:       form.line2.trim() || null,
          city:        form.city.trim(),
          postcode:    form.postcode.trim(),
          addons,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === 'existing_subscriber') {
        setError('existing_subscriber');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      setClientSecret(data.client_secret);
      setPayInfo(data);
      setActiveKitId(kId);
      setCheckoutStage('payment');
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.first_name.trim()) { setError('First name is required.'); return; }
    const emailVal = form.email.trim();
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) { setError('Please enter a valid email address.'); return; }
    if (!form.birth_year) { setError('Birth year is required.'); return; }
    if (!form.birth_month) { setError('Birth month is required.'); return; }
    if (form.birth_year < 1940 || form.birth_year > 2006) { setError('Birth year must be between 1940 and 2006.'); return; }
    if (form.birth_month < 1 || form.birth_month > 12) { setError('Birth month must be between 1 and 12.'); return; }
    if (!form.line1.trim()) { setError('Delivery address is required.'); return; }
    if (!form.city.trim()) { setError('City is required.'); return; }
    if (!form.postcode.trim()) { setError('Postcode is required.'); return; }

    setLoading(true);
    setError('');

    // DNS check
    try {
      const domain = emailVal.split('@')[1];
      const dnsRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
        headers: { Accept: 'application/dns-json' },
      });
      const dns = await dnsRes.json();
      if (dns.Status === 3 || !dns.Answer?.length) {
        setError(`We couldn't find a mail server for ${domain}. Please double-check your email address.`);
        setLoading(false);
        return;
      }
    } catch { /* DNS lookup failed — allow through */ }

    setLoading(false);

    if (kit.id === 'ground') {
      setCheckoutStep('upgrade');
      return;
    }

    await initiatePayment(kit.id, []);
  }

  // ── Kit summary panel (shared between form and payment stages) ──────────────

  const KitSummary = () => (
    <div className="co-right">
      {kit.id === 'ground' && ritualKit && checkoutStage === 'form' && (
        <div className="co-upgrade">
          <div className="co-upgrade-label">
            <span className="co-upgrade-star">★</span>
            Most customers choose RITUAL
          </div>
          <div className="co-upgrade-copy">
            You're one product away from the full ritual. The argan oil is the step that changes what your skin actually feels like long-term —<strong> most GROUND customers upgrade within 90 days.</strong>
          </div>
          <a className="co-upgrade-link" href="/checkout?kit=ritual">
            Upgrade to RITUAL — £{ritualKit.firstBoxPrice} first box →
          </a>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div className="co-kit-name">{activeKit.name}</div>
        {inventoryAvailable === false && (
          <span style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#e05c5c', fontWeight: 600, border: '1px solid rgba(224,92,92,0.4)', padding: '3px 8px' }}>Sold Out</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
        <span className="co-price-main">£{activeKit.firstBoxPrice}</span>
        <span className="co-price-label">first box</span>
      </div>
      <div className="co-price-sub">Ships {fmtDay(dispatch)} · Arrives by {fmtDay(arrival)}</div>
      <div style={{ marginTop: 14 }}>
        <span className="co-price-sub">then £{activeKit.monthlyPrice}/mo · every 30 days</span>
      </div>
      <div className="co-price-refill">First charge {fmtDate(firstCharge)} · Ships {fmtDate(refillShip)} · Arrives by {fmtDate(refillArrive)}</div>

      <div className="co-divider" />

      <div className="co-promise">
        <div className="co-promise-title">Our Promise</div>
        <div className="co-trust">
          <div className="co-trust-line">
            <span className="co-trust-check">🚫</span>
            <span>Cancel any time — no questions asked</span>
          </div>
          <div className="co-trust-line">
            <span className="co-trust-check">🔓</span>
            <span>No minimum term — leave after your first box if you want</span>
          </div>
          <div className="co-trust-line">
            <span className="co-trust-check">⏸️</span>
            <span>Pause or skip any month straight from your account</span>
          </div>
          <div className="co-trust-line">
            <span className="co-trust-check">📦</span>
            <span>Your consumables arrive before you run out — tools replaced when due</span>
          </div>
          <div className="co-trust-line">
            <span className="co-trust-check">🚚</span>
            <span>First box ships {fmtDay(dispatch)} · refills charged every 30 days</span>
          </div>
        </div>
      </div>

      <div className="co-divider" />

      <div className="co-section-label">What's in your box</div>
      <div className="co-product-list">
        {products.map(p => (
          <div key={p.num} className={`co-product${p.comingSoon ? ' dimmed' : ''}`}>
            {p.image
              ? <img src={p.image} alt={p.name} className="co-product-thumb" loading="lazy" />
              : <div className="co-product-thumb-placeholder" />
            }
            <span className="co-product-num">{p.num}</span>
            <span>{p.name}{p.comingSoon ? ' *' : ''}</span>
          </div>
        ))}
      </div>
      {products.some(p => p.comingSoon) && (
        <div className="co-soon-note">* Coming soon — included when available</div>
      )}
    </div>
  );

  // ── Payment stage ─────────────────────────────────────────────────────────

  if (checkoutStage === 'payment' && clientSecret) {
    return (
      <>
        <style>{CSS}</style>
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance: stripeAppearance }}
        >
          <div className="co-page">
            <div className="co-left">
              <div className="co-eyebrow">{activeKit.name} · £{activeKit.firstBoxPrice} first box</div>
              <div className="co-heading">Pay Now.</div>
              <div className="co-subhead">Your card details are encrypted — never stored on our servers.</div>
              <PaymentStep
                activeKit={activeKit}
                payInfo={payInfo}
                onBack={() => { setCheckoutStage('form'); window.scrollTo(0, 0); }}
              />
            </div>
            <KitSummary />
          </div>
        </Elements>
      </>
    );
  }

  // ── Form stage ────────────────────────────────────────────────────────────

  return (
    <>
      <style>{CSS}</style>

      {/* Interstitial: Upgrade to RITUAL? */}
      {checkoutStep === 'upgrade' && ritualKit && (
        <div className="co-step">
          <div className="co-step-inner">
            <button className="co-step-close" onClick={() => setCheckoutStep(null)} aria-label="Back to form">✕</button>
            <div className="co-step-eyebrow">Before you go</div>
            <div className="co-step-title">Most men who start<br />with GROUND <em>upgrade.</em></div>
            <p className="co-step-body">
              The argan oil is the step that actually changes what your skin feels like long-term. Without it, you're doing 80% of the ritual. RITUAL adds the weekly oil treatment — the part most men say they wish they'd started with.
            </p>
            <div className="co-step-perks">
              <div className="co-step-perk">→ <strong>Products 01–08</strong> — everything in GROUND plus argan oil</div>
              <div className="co-step-perk">→ <strong>Weekly oil ritual</strong> — skin that stays fed, not just after the shower</div>
              <div className="co-step-perk">→ <strong>£{ritualKit.firstBoxPrice} first box</strong>, then £{ritualKit.monthlyPrice}/mo — only £{ritualKit.firstBoxPrice - kit.firstBoxPrice} more to start</div>
            </div>
            <div className="co-step-actions">
              <button className="co-step-yes" onClick={() => initiatePayment('ritual', [])}>
                Upgrade to RITUAL — £{ritualKit.firstBoxPrice} →
              </button>
              <button className="co-step-no" onClick={() => setCheckoutStep('addon')}>
                No thanks, stay with GROUND
              </button>
              <button className="co-step-back" onClick={() => setCheckoutStep(null)}>
                ← Back to form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interstitial: Add mixing bowl? */}
      {checkoutStep === 'addon' && (
        <div className="co-step">
          <div className="co-step-inner">
            <button className="co-step-close" onClick={() => setCheckoutStep(null)} aria-label="Back to form">✕</button>
            <div className="co-step-eyebrow">One more thing</div>
            <div className="co-step-title">Add a mixing<br />bowl?</div>
            <div className="co-addon-step">
              <div className="co-addon-step-info">
                <div className="co-addon-step-name">Silicone Mixing Bowl</div>
                <div className="co-addon-step-desc">Mix your clay mask in the shower without making a mess. Keeps the clay off the tile. Rinses clean in seconds. One use, every week.</div>
              </div>
              <div className="co-addon-step-price">£10</div>
            </div>
            <div className="co-step-actions">
              <button className="co-step-yes" onClick={() => initiatePayment('ground', ['mixing_bowl'])}>
                Yes, add it — £{kit.firstBoxPrice + 10} total →
              </button>
              <button className="co-step-no" onClick={() => initiatePayment('ground', [])}>
                No thanks, continue to payment
              </button>
              <button className="co-step-back" onClick={() => setCheckoutStep('upgrade')}>
                ← Back
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="co-overlay">
          <div className="co-overlay-inner">
            <div className="co-overlay-tag">The 180 Club</div>
            <img src={tshirtImg} alt="SOLUM 180 Tee" className="co-overlay-img" />
            <div className="co-overlay-title">You Can't<br />Buy <em>This.</em></div>
            <div className="co-overlay-rule">Not for sale. Not in the shop. Only earned.</div>
            <p className="co-overlay-body">
              Six months of continuous subscription — that's the only qualification.<br />
              Stay consistent. Do the ritual. At month six it ships with your box.
            </p>
            <div className="co-overlay-spinner">
              <div className="co-overlay-dot" />
              <div className="co-overlay-dot" />
              <div className="co-overlay-dot" />
              <span>Preparing secure payment…</span>
            </div>
          </div>
        </div>
      )}

      <div className="co-page">
        <div className="co-left">
          <a className="co-back" href="/#kits">← Choose a different kit</a>
          <div className="co-eyebrow">{kit.name} · £{kit.firstBoxPrice} first box</div>

          {inventoryAvailable !== false && <>
            <div className="co-heading">Start Your Ritual.</div>
            <div className="co-subhead">Takes 60 seconds. Payment is encrypted and secure.</div>
          </>}

          {/* Waitlist */}
          {inventoryAvailable === false && (
            <div className="co-waitlist-block">
              {waitlistState === 'done' ? (
                <div className="co-waitlist-done">
                  <div className="co-waitlist-done-tick">✓</div>
                  <div className="co-waitlist-done-title">You're on the list.</div>
                  <div className="co-waitlist-done-body">
                    We'll email you the moment {kit.name} is back in stock.<br />
                    Usually within a week.
                  </div>
                </div>
              ) : (
                <>
                  <div className="co-waitlist-eyebrow">Sold Out</div>
                  <div className="co-waitlist-title">Get notified<br />when it's back.</div>
                  <div className="co-waitlist-body">
                    {kit.name} is temporarily out of stock. Leave your details and we'll email you the moment it's available — no spam, one email.
                  </div>
                  <form onSubmit={handleWaitlist} noValidate>
                    <div className="co-row">
                      <div className="co-field">
                        <label className="co-label">First Name</label>
                        <input className="co-input" value={waitlistForm.first_name} onChange={e => setWaitlistForm(f => ({ ...f, first_name: e.target.value }))} placeholder="James" />
                      </div>
                      <div className="co-field">
                        <label className="co-label">Last Name</label>
                        <input className="co-input" value={waitlistForm.last_name} onChange={e => setWaitlistForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Smith" />
                      </div>
                    </div>
                    <div className="co-field">
                      <label className="co-label">Email</label>
                      <input className="co-input" type="email" value={waitlistForm.email} onChange={e => setWaitlistForm(f => ({ ...f, email: e.target.value }))} placeholder="james@example.com" required />
                    </div>
                    {waitlistState === 'error' && (
                      <div className="co-error">Something went wrong — please try again.</div>
                    )}
                    <button type="submit" className="co-waitlist-submit" disabled={waitlistState === 'submitting'}>
                      {waitlistState === 'submitting' ? 'Saving…' : 'Notify Me When Available →'}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* Main order form */}
          {inventoryAvailable !== false && (
            <form onSubmit={handleSubmit} noValidate>
              {/* Personal details */}
              <div className="co-row">
                <div className="co-field">
                  <label className="co-label">First Name</label>
                  <input className="co-input" value={form.first_name} onChange={set('first_name')} placeholder="James" required />
                </div>
                <div className="co-field">
                  <label className="co-label">Last Name</label>
                  <input className="co-input" value={form.last_name} onChange={set('last_name')} placeholder="Smith" />
                </div>
              </div>
              <div className="co-field">
                <label className="co-label">Email</label>
                <input className="co-input" type="email" value={form.email} onChange={set('email')} placeholder="james@example.com" required />
              </div>
              <div className="co-field">
                <label className="co-label">Phone</label>
                <input className="co-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+44 7700 900000" />
              </div>
              <div className="co-row">
                <div className="co-field">
                  <label className="co-label">Birth Year</label>
                  <input className="co-input" type="number" min="1940" max="2006" value={form.birth_year} onChange={set('birth_year')} placeholder="1990" required />
                </div>
                <div className="co-field">
                  <label className="co-label">Birth Month</label>
                  <input className="co-input" type="number" min="1" max="12" value={form.birth_month} onChange={set('birth_month')} placeholder="1–12" required />
                </div>
              </div>

              {/* Delivery address */}
              <div className="co-section-divider">Delivery Address</div>
              <div className="co-field">
                <label className="co-label">Address Line 1</label>
                <input className="co-input" value={form.line1} onChange={set('line1')} placeholder="12 Example Street" required />
              </div>
              <div className="co-field">
                <label className="co-label">Address Line 2 <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input className="co-input" value={form.line2} onChange={set('line2')} placeholder="Flat, apartment, suite..." />
              </div>
              <div className="co-row">
                <div className="co-field">
                  <label className="co-label">City</label>
                  <input className="co-input" value={form.city} onChange={set('city')} placeholder="London" required />
                </div>
                <div className="co-field">
                  <label className="co-label">Postcode</label>
                  <input className="co-input" value={form.postcode} onChange={set('postcode')} placeholder="SW1A 1AA" required />
                </div>
              </div>

              {error === 'existing_subscriber' ? (
                <div className="co-error">
                  You already have a SOLUM subscription.{' '}
                  <a href="/account" style={{ color: 'inherit', textDecoration: 'underline' }}>Manage your account →</a>
                </div>
              ) : error ? (
                <div className="co-error">{error}</div>
              ) : null}

              <button type="submit" className="co-submit" disabled={loading}>
                {loading ? 'Checking details…' : 'Continue to Payment →'}
              </button>
              <div className="co-secure">
                By placing an order you agree to our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--stone)', textDecoration: 'underline' }}>Terms &amp; Conditions</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--stone)', textDecoration: 'underline' }}>Privacy Policy</a>
              </div>
              <div className="co-secure" style={{ marginTop: 4 }}>We never share your data · Cancel any time</div>
              <div className="co-stripe-badge">
                <span className="co-stripe-lock">🔒</span>
                <span className="co-stripe-text">256-bit SSL · Secured by</span>
                <span className="co-stripe-logo">Stripe</span>
              </div>
            </form>
          )}
        </div>

        <KitSummary />
      </div>
    </>
  );
}
