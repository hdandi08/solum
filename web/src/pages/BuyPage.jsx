import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { KITS } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';
import { capture, identify, fbViewContent, fbInitiateCheckout } from '../lib/analytics.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STRIPE_KEY   = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

const stripePromise = loadStripe(STRIPE_KEY);

const PREMIUM_SOURCES = ['gift', 'tiktok_shop'];

const FIRST_BATCH_PRICES = { ground: 65, ritual: 85 };
const PREMIUM_PRICES     = { ground: 75, ritual: 95 };

// ── Stripe appearance — matches SOLUM dark aesthetic ─────────────────────────

const stripeAppearance = {
  theme: 'night',
  variables: {
    colorPrimary:       '#4A8FC7',
    colorBackground:    '#08090B',
    colorText:          '#F0ECE2',
    colorTextSecondary: 'rgba(168,180,188,0.8)',
    colorDanger:        '#e05c5c',
    fontFamily:         '"Barlow Condensed", system-ui, sans-serif',
    fontSizeBase:       '16px',
    borderRadius:       '0px',
    spacingUnit:        '5px',
  },
  rules: {
    '.Input': { border: '1px solid rgba(240,236,226,0.15)', backgroundColor: '#08090B', padding: '14px 16px' },
    '.Input:focus': { border: '1px solid #4A8FC7', boxShadow: 'none', outline: 'none' },
    '.Label': { fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '600', color: 'rgba(168,180,188,0.9)', marginBottom: '7px' },
    '.Tab': { border: '1px solid rgba(240,236,226,0.15)', backgroundColor: '#08090B' },
    '.Tab--selected': { border: '1px solid #4A8FC7', backgroundColor: '#0d1520' },
  },
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function getDispatchDate() {
  const now = new Date();
  const day = now.getDay();
  const isBeforeNoon = now.getHours() < 12;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const daysToAdd = { 1: 3, 2: 2, 4: 4, 5: 3, 6: 2 };
  if (day in daysToAdd) d.setDate(d.getDate() + daysToAdd[day]);
  else if (day === 3) d.setDate(d.getDate() + (isBeforeNoon ? 1 : 5));
  else d.setDate(d.getDate() + (isBeforeNoon ? 1 : 4));
  return d;
}

function getArrivalDate(dispatch) {
  const d = new Date(dispatch); d.setDate(d.getDate() + 2); return d;
}

function fmtDay(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
.by-page{min-height:100vh;background:var(--black);display:grid;grid-template-columns:1fr 420px;gap:0;padding-top:64px;}
.by-left{padding:64px 56px 80px;border-right:1px solid var(--line);}
.by-right{padding:48px 40px;position:sticky;top:64px;align-self:start;height:calc(100vh - 64px);overflow-y:auto;background:var(--char);border-left:1px solid var(--lineb);}

.by-back{display:inline-flex;align-items:center;gap:8px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);text-decoration:none;margin-bottom:48px;transition:color .2s;}
.by-back:hover{color:var(--bone);}

.by-eyebrow{font-size:13px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:12px;}
.by-heading{font-family:'Bebas Neue',sans-serif;font-size:clamp(42px,5vw,72px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:10px;}
.by-subhead{font-size:16px;color:var(--stone);font-weight:300;margin-bottom:36px;line-height:1.5;}

/* Kit selector */
.by-kits{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);margin-bottom:36px;}
@media(max-width:520px){.by-kits{grid-template-columns:1fr;}}
.by-kit{background:var(--black);padding:28px 24px;cursor:pointer;transition:background .15s;}
.by-kit:hover{background:var(--dark);}
.by-kit.selected{background:var(--dark);outline:2px solid var(--blue);}
.by-kit.soldout{opacity:.45;cursor:default;}
.by-kit-badge{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);font-weight:700;margin-bottom:10px;display:block;}
.by-kit-name{font-family:'Bebas Neue',sans-serif;font-size:34px;letter-spacing:.06em;line-height:1;margin-bottom:6px;color:var(--bone);}
.by-kit-tagline{font-size:13px;font-weight:300;color:var(--stone);line-height:1.5;margin-bottom:16px;}
.by-kit-price{font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:-1px;line-height:1;color:var(--bone);}
.by-kit-price-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);margin-top:3px;}
.by-kit-soldout-tag{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);margin-top:8px;}

/* Form */
.by-section-divider{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;margin:28px 0 22px;padding-bottom:10px;border-bottom:1px solid var(--line);}
.by-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.by-field{display:flex;flex-direction:column;gap:7px;margin-bottom:18px;}
.by-label{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.by-input{background:var(--dark);border:1px solid var(--lineb);color:var(--bone);padding:14px 16px;font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:300;outline:none;transition:border-color .2s;width:100%;box-sizing:border-box;}
.by-input:focus{border-color:var(--blue);}
.by-input::placeholder{color:rgba(168,180,188,0.4);}
.by-submit{width:100%;background:var(--bone);color:var(--black);border:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.15em;padding:18px;cursor:pointer;transition:background .2s,transform .15s;margin-top:8px;}
.by-submit:hover:not(:disabled){background:#fff;transform:translateY(-1px);}
.by-submit:disabled{background:var(--stone);cursor:wait;transform:none;}
.by-error{font-size:14px;color:#e05c5c;margin-top:8px;line-height:1.5;padding:12px 16px;border:1px solid rgba(224,92,92,0.3);background:rgba(224,92,92,0.05);}
.by-secure{font-size:13px;color:var(--stone);font-weight:300;margin-top:14px;text-align:center;}
.by-stripe-badge{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:12px;padding:10px 16px;border:1px solid rgba(99,91,255,0.2);background:rgba(99,91,255,0.04);}
.by-stripe-text{font-size:12px;color:var(--stone);font-weight:300;letter-spacing:.5px;}
.by-stripe-logo{font-size:13px;font-weight:700;letter-spacing:-.5px;color:#a09bff;}

/* Payment step */
.by-order-pill{background:rgba(46,109,164,0.12);border:1px solid rgba(74,143,199,0.3);padding:16px 20px;margin-bottom:28px;}
.by-order-pill-kit{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:6px;}
.by-order-pill-price{font-size:18px;color:var(--bone);font-weight:500;}
.by-order-pill-sub{font-size:13px;color:var(--stone);font-weight:300;margin-top:4px;}
.by-payment-wrap{margin-bottom:24px;}

/* Waitlist */
.by-waitlist-block{border:1px solid var(--lineb);background:rgba(46,109,164,0.04);padding:28px 28px 24px;}
.by-waitlist-eyebrow{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:#e05c5c;font-weight:600;margin-bottom:12px;}
.by-waitlist-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,5vw,52px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:10px;}
.by-waitlist-body{font-size:15px;color:var(--stone);font-weight:300;line-height:1.6;margin-bottom:24px;}
.by-waitlist-cta{display:block;text-align:center;text-decoration:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.12em;background:var(--bone);color:var(--black);padding:18px 40px;}

/* Right panel */
.by-right-kit{font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:.05em;color:var(--bone);line-height:1;margin-bottom:4px;}
.by-right-price-row{display:flex;align-items:baseline;gap:6px;margin-top:8px;}
.by-right-price{font-family:'Bebas Neue',sans-serif;font-size:56px;color:var(--bone);letter-spacing:-1px;line-height:1;}
.by-right-price-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);}
.by-ship-line{font-size:15px;color:var(--stone);font-weight:300;margin-top:5px;}
.by-stock-pill{display:inline-flex;align-items:center;gap:8px;margin-top:12px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);border:1px solid rgba(46,109,164,0.35);padding:6px 12px;}
.by-stock-dot{width:5px;height:5px;border-radius:50%;background:var(--blit);animation:bydot 2s ease infinite;}
@keyframes bydot{0%,100%{opacity:1;}50%{opacity:.3;}}
.by-divider{height:1px;background:var(--line);margin:22px 0;}
.by-section-label{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:14px;}
.by-product-list{display:flex;flex-direction:column;gap:9px;margin-bottom:4px;}
.by-product{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--mist);font-weight:300;}
.by-product-num{font-size:10px;letter-spacing:2px;color:var(--blue);font-weight:600;min-width:22px;}
.by-product-thumb{width:32px;height:40px;object-fit:cover;background:var(--dark);border:1px solid var(--line);flex-shrink:0;}
.by-product-thumb-ph{width:32px;height:40px;background:var(--dark);border:1px solid var(--line);flex-shrink:0;}
.by-promise{border:1px solid var(--lineb);padding:20px 20px 16px;}
.by-promise-title{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.by-trust{display:flex;flex-direction:column;gap:0;}
.by-trust-line{display:flex;align-items:flex-start;gap:12px;font-size:14px;color:var(--mist);font-weight:300;line-height:1.4;padding:10px 0;border-bottom:1px solid var(--line);}
.by-trust-line:last-child{border-bottom:none;padding-bottom:0;}
.by-trust-check{color:var(--blue);font-size:12px;flex-shrink:0;margin-top:2px;font-weight:700;}

@media(max-width:900px){
  .by-page{grid-template-columns:1fr;}
  .by-right{position:static;height:auto;border-left:none;border-bottom:1px solid var(--lineb);padding:28px 24px;}
  .by-left{padding:36px 24px 64px;border-right:none;}
}
`;

// ── PaymentStep — inside <Elements> ──────────────────────────────────────────

function PaymentStep({ activeKit, payInfo, source, onBack }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const totalPrice = (payInfo.amount_pence / 100).toFixed(0);

  async function handlePay(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success?kit=${activeKit.id}&source=${source}&amount=${payInfo.amount_pence}`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.');
      setLoading(false);
    } else if (paymentIntent?.status === 'succeeded') {
      const ref      = paymentIntent.id ?? '';
      const dispatch = encodeURIComponent(payInfo.dispatch_date ?? '');
      const arrival  = encodeURIComponent(payInfo.arrival_date ?? '');
      window.location.href = `/success?kit=${activeKit.id}&source=${source}&ref=${ref}&dispatch=${dispatch}&arrival=${arrival}&amount=${payInfo.amount_pence}`;
    } else {
      setError('Something went wrong. Please try again or contact contact@bysolum.co.uk.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handlePay} noValidate>
      <div className="by-order-pill">
        <div className="by-order-pill-kit">{activeKit.name} · First Box · One-Time</div>
        <div className="by-order-pill-price">£{totalPrice} today</div>
        <div className="by-order-pill-sub">
          Ships {payInfo.dispatch_date} · Arrives {payInfo.arrival_date}
        </div>
        <div className="by-order-pill-sub" style={{ marginTop: 4 }}>
          No subscription — this is your only charge.
        </div>
      </div>

      <div className="by-payment-wrap" data-testid="payment-element-wrapper">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && <div className="by-error" data-testid="pay-error">{error}</div>}

      <button type="submit" className="by-submit" disabled={!stripe || !elements || loading} data-testid="pay-btn">
        {loading ? 'Processing…' : `Pay £${totalPrice} Now →`}
      </button>

      <div className="by-secure" style={{ marginTop: 10 }}>
        By paying you agree to our{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--stone)', textDecoration: 'underline' }}>Terms</a>
        {' '}and{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--stone)', textDecoration: 'underline' }}>Privacy Policy</a>
      </div>

      <div className="by-stripe-badge">
        <span style={{ fontSize: 13, color: '#a09bff' }}>🔒</span>
        <span className="by-stripe-text">256-bit SSL · Secured by</span>
        <span className="by-stripe-logo">Stripe</span>
      </div>

      <button
        type="button"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--stone)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, marginTop: 20, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
        onClick={onBack}
      >
        ← Back to your details
      </button>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BuyPage() {
  const [params] = useSearchParams();

  const rawSource = params.get('source');
  const source = rawSource === 'tiktok' ? 'tiktok_shop' : (rawSource ?? 'first_batch');
  const preselect = params.get('kit');

  const isPremium  = PREMIUM_SOURCES.includes(source);
  const isFirstBatch = source === 'first_batch';
  const prices = isPremium ? PREMIUM_PRICES : FIRST_BATCH_PRICES;

  const [inventory, setInventory]       = useState(null);
  const [selectedKit, setSelectedKit]   = useState(preselect ?? 'ritual');
  const [form, setForm]                 = useState({ first_name: '', last_name: '', email: '', phone: '', line1: '', line2: '', city: '', postcode: '' });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [stage, setStage]               = useState('form'); // 'form' | 'payment'
  const [clientSecret, setClientSecret] = useState(null);
  const [payInfo, setPayInfo]           = useState(null);

  const dispatch = getDispatchDate();
  const arrival  = getArrivalDate(dispatch);

  const authHeaders = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` };

  // Fire buy_page_viewed + Meta ViewContent once on mount
  useEffect(() => {
    capture('buy_page_viewed', { source, preselect: preselect ?? 'none' });
    fbViewContent('SOLUM Kit');
  }, []); // eslint-disable-line

  useEffect(() => {
    fetch(`${SUPABASE_URL}/functions/v1/get-inventory-status`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => setInventory(d.kits ?? {}))
      .catch(() => setInventory({}));
  }, []); // eslint-disable-line

  const bothSoldOut = inventory && !inventory.ground?.available && !inventory.ritual?.available;
  const totalRemaining = (inventory?.ground?.count ?? 0) + (inventory?.ritual?.count ?? 0);
  const kitDef = KITS.find(k => k.id === selectedKit);

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.first_name.trim()) { setError('First name is required.'); return; }
    const emailVal = form.email.trim();
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) { setError('Please enter a valid email address.'); return; }
    if (!form.phone.trim()) { setError('Phone number is required for delivery updates.'); return; }
    if (!form.line1.trim()) { setError('Delivery address is required.'); return; }
    if (!form.city.trim()) { setError('City is required.'); return; }
    if (!form.postcode.trim()) { setError('Postcode is required.'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-first-box-payment-intent`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kit_id:     selectedKit,
          email:      emailVal,
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim() || null,
          phone:      form.phone.trim() || null,
          source,
          line1:      form.line1.trim(),
          line2:      form.line2.trim() || null,
          city:       form.city.trim(),
          postcode:   form.postcode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      // Identify the user in PostHog and fire checkout funnel events
      identify(emailVal, { first_name: form.first_name.trim(), kit: selectedKit, source });
      capture('checkout_initiated', { kit: selectedKit, source, price: prices[selectedKit] });
      fbInitiateCheckout(KITS.find(k => k.id === selectedKit)?.name ?? selectedKit, prices[selectedKit]);
      // Store email so SuccessPage can identify the user after redirect
      try { sessionStorage.setItem('solum_buyer_email', emailVal); } catch {}

      setClientSecret(data.client_secret);
      setPayInfo(data);
      setStage('payment');
      window.scrollTo(0, 0);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Right summary panel ───────────────────────────────────────────────────

  const RightPanel = () => {
    const activeKit = KITS.find(k => k.id === selectedKit) ?? KITS[1];
    const activeProducts = PRODUCTS.filter(
      p => activeKit.productNums.includes(p.num) && !p.comingSoon,
    );

    return (
      <div className="by-right">
        <div className="by-right-kit">{activeKit.name}</div>
        <div className="by-right-price-row">
          <span className="by-right-price">£{prices[activeKit.id] ?? prices.ritual}</span>
          <span className="by-right-price-label">one-time</span>
        </div>
        <div className="by-ship-line">Ships {fmtDay(dispatch)} · Arrives by {fmtDay(arrival)}</div>
        <div className="by-ship-line">Royal Mail Tracked 48 · UK only</div>

        {isFirstBatch && inventory && (
          <div className="by-stock-pill" data-testid="stock-count">
            <span className="by-stock-dot" />
            {totalRemaining} of 250 remaining
          </div>
        )}

        <div className="by-divider" />

        <div className="by-section-label">What's in your box</div>
        <div className="by-product-list">
          {activeProducts.map(p => (
            <div key={p.num} className="by-product">
              {p.image
                ? <img src={p.image} alt={p.name} className="by-product-thumb" loading="lazy" />
                : <div className="by-product-thumb-ph" />
              }
              <span className="by-product-num">{p.num}</span>
              <span>{p.name}</span>
            </div>
          ))}
        </div>

        <div className="by-divider" />

        <div className="by-promise">
          <div className="by-promise-title">Before You Buy</div>
          <div className="by-trust">
            <div className="by-trust-line">
              <span className="by-trust-check">◆</span>
              <span>One-time purchase — no subscription, no recurring charge</span>
            </div>
            <div className="by-trust-line">
              <span className="by-trust-check">◆</span>
              <span>Ships {fmtDay(dispatch)} · arrives by {fmtDay(arrival)} via Royal Mail Tracked 48</span>
            </div>
            <div className="by-trust-line">
              <span className="by-trust-check">◆</span>
              <span>QR code in the box — full ritual guide at bysolum.co.uk/ritual</span>
            </div>
            <div className="by-trust-line">
              <span className="by-trust-check">◆</span>
              <span>Secured by Stripe — your card details never touch our servers</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Payment stage ─────────────────────────────────────────────────────────

  if (stage === 'payment' && clientSecret) {
    return (
      <>
        <style>{CSS}</style>
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
          <div className="by-page">
            <div className="by-left">
              <div className="by-eyebrow">{kitDef?.name} · £{prices[selectedKit]} one-time</div>
              <div className="by-heading">Pay Now.</div>
              <div className="by-subhead">Your card details are encrypted — never stored on our servers.</div>
              <PaymentStep
                activeKit={kitDef}
                payInfo={payInfo}
                source={source}
                onBack={() => { setStage('form'); window.scrollTo(0, 0); }}
              />
            </div>
            <RightPanel />
          </div>
        </Elements>
      </>
    );
  }

  // ── Form stage ────────────────────────────────────────────────────────────

  const eyebrow = isFirstBatch
    ? '250 Kits · No Subscription Required'
    : source === 'gift'
    ? 'Gift Purchase · One-Time'
    : 'One-Time Purchase · No Commitment';

  return (
    <>
      <style>{CSS}</style>
      <div className="by-page">
        <div className="by-left">
          <a className="by-back" href="/#kits">← Back to kits</a>

          {bothSoldOut ? (
            <div className="by-waitlist-block">
              <div className="by-waitlist-eyebrow">Sold Out</div>
              <div className="by-waitlist-title">All 250<br />claimed.</div>
              <div className="by-waitlist-body">
                The first batch is gone. Leave your email and you'll be first to know when we restock with 1,000+ units.
              </div>
              <a href="mailto:contact@bysolum.co.uk?subject=Restock%20Waitlist" className="by-waitlist-cta">
                Join the waitlist →
              </a>
            </div>
          ) : (
            <>
              <div className="by-eyebrow">{eyebrow}</div>
              <div className="by-heading">
                {isFirstBatch ? 'The First 250.' : 'Get Your Kit.'}
              </div>
              <div className="by-subhead">
                {isFirstBatch
                  ? 'First-batch pricing. No subscription. Start the ritual today.'
                  : source === 'gift'
                  ? 'Send someone the full system. We ship directly to them.'
                  : 'One-time purchase. Subscribe for monthly refills anytime after.'}
              </div>

              {/* Kit selector */}
              <div className="by-kits">
                {(['ground', 'ritual']).map(id => {
                  const kit = KITS.find(k => k.id === id);
                  const stock = inventory?.[id];
                  const available = !inventory || stock?.available;
                  return (
                    <div
                      key={id}
                      data-testid={`kit-${id}`}
                      className={`by-kit${selectedKit === id ? ' selected' : ''}${!available ? ' soldout' : ''}`}
                      onClick={() => available && setSelectedKit(id)}
                    >
                      {kit?.popular && <span className="by-kit-badge">Most Popular</span>}
                      <div className="by-kit-name">{kit?.name}</div>
                      <div className="by-kit-tagline">{kit?.tagline}</div>
                      <div className="by-kit-price">£{prices[id]}</div>
                      <div className="by-kit-price-label">one-time</div>
                      {!available && <div className="by-kit-soldout-tag">Sold Out</div>}
                    </div>
                  );
                })}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate>
                <div className="by-row">
                  <div className="by-field">
                    <label className="by-label">First Name</label>
                    <input className="by-input" type="text" required placeholder="James" value={form.first_name} onChange={set('first_name')} />
                  </div>
                  <div className="by-field">
                    <label className="by-label">Last Name</label>
                    <input className="by-input" type="text" placeholder="Smith" value={form.last_name} onChange={set('last_name')} />
                  </div>
                </div>

                <div className="by-field">
                  <label className="by-label">Email</label>
                  <input className="by-input" type="email" required placeholder="james@example.com" value={form.email} onChange={set('email')} />
                </div>

                <div className="by-field">
                  <label className="by-label">Phone <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0 }}>— for delivery updates</span></label>
                  <input className="by-input" type="tel" required placeholder="+44 7700 900000" value={form.phone} onChange={set('phone')} />
                </div>

                <div className="by-section-divider">Delivery Address</div>

                <div className="by-field">
                  <label className="by-label">Address Line 1</label>
                  <input className="by-input" type="text" required placeholder="12 Example Street" value={form.line1} onChange={set('line1')} />
                </div>
                <div className="by-field">
                  <label className="by-label">Address Line 2 <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <input className="by-input" type="text" placeholder="Flat, apartment…" value={form.line2} onChange={set('line2')} />
                </div>
                <div className="by-row">
                  <div className="by-field">
                    <label className="by-label">City</label>
                    <input className="by-input" type="text" required placeholder="London" value={form.city} onChange={set('city')} />
                  </div>
                  <div className="by-field">
                    <label className="by-label">Postcode</label>
                    <input className="by-input" type="text" required placeholder="SW1A 1AA" value={form.postcode} onChange={set('postcode')} />
                  </div>
                </div>

                {error && <div className="by-error" data-testid="form-error">{error}</div>}

                <button className="by-submit" type="submit" disabled={loading || !selectedKit} data-testid="continue-btn">
                  {loading ? 'Checking details…' : 'Continue to Payment →'}
                </button>

                <div className="by-secure">
                  By placing an order you agree to our{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--stone)', textDecoration: 'underline' }}>Terms</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--stone)', textDecoration: 'underline' }}>Privacy Policy</a>
                </div>
                <div className="by-stripe-badge">
                  <span style={{ fontSize: 13, color: '#a09bff' }}>🔒</span>
                  <span className="by-stripe-text">256-bit SSL · Secured by</span>
                  <span className="by-stripe-logo">Stripe</span>
                </div>
              </form>
            </>
          )}
        </div>

        <RightPanel />
      </div>
    </>
  );
}
