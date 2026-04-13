import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { KITS } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';
import tshirtImg from '../assets/solum-tshirt.jpeg';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY;

const CSS = `
.co-page{min-height:100vh;background:var(--black);display:grid;grid-template-columns:1fr 420px;gap:0;padding-top:64px;}
.co-left{padding:64px 56px 80px;border-right:1px solid var(--line);}
.co-right{padding:48px 40px;position:sticky;top:64px;align-self:start;height:calc(100vh - 64px);overflow-y:auto;background:var(--char);border-left:1px solid var(--lineb);}

/* Left — form */
.co-back{display:inline-flex;align-items:center;gap:8px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);text-decoration:none;margin-bottom:48px;transition:color .2s;}
.co-back:hover{color:var(--bone);}
.co-eyebrow{font-size:13px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:12px;}
.co-heading{font-family:'Bebas Neue',sans-serif;font-size:clamp(42px,5vw,72px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:12px;}
.co-subhead{font-size:16px;color:var(--stone);font-weight:300;margin-bottom:48px;line-height:1.5;}
.co-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.co-field{display:flex;flex-direction:column;gap:7px;margin-bottom:20px;}
.co-label{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.co-input{background:var(--dark);border:1px solid var(--lineb);color:var(--bone);padding:14px 16px;font-family:'Barlow Condensed',sans-serif;font-size:16px;outline:none;transition:border-color .2s;width:100%;}
.co-input:focus{border-color:var(--blue);}
.co-input::placeholder{color:rgba(168,180,188,0.5);}
.co-submit{width:100%;background:var(--bone);color:var(--black);border:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.15em;padding:18px;cursor:pointer;transition:background .2s,transform .15s;margin-top:8px;}
.co-submit:hover:not(:disabled){background:#fff;transform:translateY(-1px);}
.co-submit:disabled{background:var(--stone);cursor:wait;transform:none;}
.co-secure{font-size:13px;color:var(--stone);font-weight:300;margin-top:14px;text-align:center;}
.co-error{font-size:14px;color:#e05c5c;margin-top:14px;line-height:1.5;padding:12px 16px;border:1px solid rgba(224,92,92,0.3);background:rgba(224,92,92,0.05);}

/* Stripe badge */
.co-stripe-badge{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:16px;padding:12px 16px;border:1px solid rgba(99,91,255,0.2);background:rgba(99,91,255,0.04);}
.co-stripe-lock{font-size:13px;color:#a09bff;}
.co-stripe-text{font-size:12px;color:var(--stone);font-weight:300;letter-spacing:.5px;}

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
.co-stripe-logo{font-size:13px;font-weight:700;letter-spacing:-.5px;color:#a09bff;}

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
.co-product.dimmed{opacity:.45;}
.co-soon-note{font-size:12px;color:var(--stone);font-style:italic;margin-top:6px;}
/* Our Promise block */
.co-promise{border:1px solid var(--lineb);padding:20px 20px 16px;}
.co-promise-title{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.co-trust{display:flex;flex-direction:column;gap:0;}
.co-trust-line{display:flex;align-items:flex-start;gap:12px;font-size:14px;color:var(--mist);font-weight:300;line-height:1.4;padding:10px 0;border-bottom:1px solid var(--line);}
.co-trust-line:last-child{border-bottom:none;padding-bottom:0;}
.co-trust-check{color:var(--blue);font-size:12px;flex-shrink:0;margin-top:2px;font-weight:700;}
/* Right panel — upgrade nudge (passive, top of panel) */
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

// ── Shipping date helpers ──────────────────────────────────────────────────

function getNextMondayDispatch() {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntil = day === 1 ? 7 : (1 + 7 - day) % 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  return next;
}

function getFirstBoxArrival(dispatch) {
  const d = new Date(dispatch);
  d.setDate(d.getDate() + 3);
  return d;
}

function getFirstBillingDate(dispatch) {
  if (dispatch.getDate() <= 7) {
    return new Date(dispatch.getFullYear(), dispatch.getMonth(), 25);
  }
  return new Date(dispatch.getFullYear(), dispatch.getMonth() + 1, 25);
}

function getRefillShipDate(billing) {
  return new Date(billing.getFullYear(), billing.getMonth(), 28);
}

function getRefillArrivalDate(billing) {
  return new Date(billing.getFullYear(), billing.getMonth() + 1, 1);
}

function fmtDay(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtDate(date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function CheckoutPage() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const kitId       = params.get('kit');
  const kit         = KITS.find(k => k.id === kitId);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [form, setForm]                 = useState({ first_name: '', last_name: '', email: '', birth_year: '', birth_month: '' });
  const [checkoutStep, setCheckoutStep] = useState(null); // null | 'upgrade' | 'addon'
  const [inventoryAvailable, setInventoryAvailable] = useState(null); // null=checking, true=ok, false=sold out
  const [waitlistForm, setWaitlistForm] = useState({ first_name: '', last_name: '', email: '' });
  const [waitlistState, setWaitlistState] = useState('idle'); // idle | submitting | done | error

  useEffect(() => {
    fetch(`${SUPABASE_URL}/functions/v1/get-inventory-status`, {
      headers: { 'apikey': ANON_KEY },
    })
      .then(r => r.json())
      .then(data => {
        const available = data?.kits?.[kit.id];
        setInventoryAvailable(available !== false); // undefined (no data) = allow through
      })
      .catch(() => setInventoryAvailable(true)); // network error — allow through
  }, [kit.id]); // eslint-disable-line

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

  // Invalid kit — redirect to kits section
  if (!kit || kit.comingSoon) {
    navigate('/#kits');
    return null;
  }

  const products    = PRODUCTS.filter(p => kit.productNums.includes(p.num));
  const ritualKit   = KITS.find(k => k.id === 'ritual');

  const dispatch     = getNextMondayDispatch();
  const arrival      = getFirstBoxArrival(dispatch);
  const billing      = getFirstBillingDate(dispatch);
  const refillShip   = getRefillShipDate(billing);
  const refillArrive = getRefillArrivalDate(billing);

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function callStripe(kitId, addons = []) {
    setCheckoutStep(null);
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          kit_id:      kitId,
          email:       form.email.trim(),
          first_name:  form.first_name.trim(),
          last_name:   form.last_name.trim() || null,
          birth_year:  form.birth_year  ? parseInt(form.birth_year)  : null,
          birth_month: form.birth_month ? parseInt(form.birth_month) : null,
          addons,
          success_url: `${window.location.origin}/success?kit=${kitId}&ref={CHECKOUT_SESSION_ID}`,
          cancel_url:  `${window.location.origin}/checkout?kit=${kit.id}`,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === 'existing_subscriber') {
        setError('existing_subscriber');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Something went wrong. Please try again or contact contact@bysolum.com.');
      if (data.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
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

    setLoading(true);
    setError('');
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
    } catch {
      // DNS lookup failed — allow through
    }

    setLoading(false);

    // GROUND: show upgrade prompt before going to Stripe
    if (kit.id === 'ground') {
      setCheckoutStep('upgrade');
      return;
    }

    await callStripe(kit.id, []);
  }

  return (
    <>
      <style>{CSS}</style>

      {/* Step 1: Upgrade to RITUAL? */}
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
              <button className="co-step-yes" onClick={() => callStripe('ritual', [])}>
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

      {/* Step 2: Add mixing bowl? */}
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
              <div className="co-addon-step-price">£15</div>
            </div>
            <div className="co-step-actions">
              <button className="co-step-yes" onClick={() => callStripe('ground', ['mixing_bowl'])}>
                Yes, add it — £{kit.firstBoxPrice + 15} total →
              </button>
              <button className="co-step-no" onClick={() => callStripe('ground', [])}>
                No thanks, continue to checkout
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
              <span>Taking you to Stripe</span>
            </div>
          </div>
        </div>
      )}

      <div className="co-page">

        {/* ── LEFT — FORM ── */}
        <div className="co-left">
          <a className="co-back" href="/full#kits">← Choose a different kit</a>
          <div className="co-eyebrow">{kit.name} · £{kit.firstBoxPrice} first box</div>
          {inventoryAvailable !== false && <>
            <div className="co-heading">Start Your Ritual.</div>
            <div className="co-subhead">Takes 30 seconds. You'll be at Stripe in a moment.</div>
          </>}

          {inventoryAvailable === false ? (
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
          ) : null}

          {inventoryAvailable !== false && <form onSubmit={handleSubmit} noValidate>
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

            {error === 'existing_subscriber' ? (
              <div className="co-error">
                You already have a SOLUM subscription.{' '}
                <a href="/account" style={{ color: 'inherit', textDecoration: 'underline' }}>Manage your account →</a>
              </div>
            ) : error ? (
              <div className="co-error">{error}</div>
            ) : null}

            <button type="submit" className="co-submit" disabled={loading}>
              {loading ? 'Checking details…' : `Go to Checkout — £${kit.firstBoxPrice} →`}
            </button>
            <div className="co-secure">
              By placing an order you agree to our{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{color:'var(--stone)',textDecoration:'underline'}}>Terms &amp; Conditions</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{color:'var(--stone)',textDecoration:'underline'}}>Privacy Policy</a>
            </div>
            <div className="co-secure" style={{marginTop:4}}>We never share your data · Cancel any time</div>
            <div className="co-stripe-badge">
              <span className="co-stripe-lock">🔒</span>
              <span className="co-stripe-text">Payments secured by</span>
              <span className="co-stripe-logo">Stripe</span>
            </div>
          </form>}
        </div>

        {/* ── RIGHT — KIT SUMMARY ── */}
        <div className="co-right">

          {/* Upgrade nudge — GROUND only, pinned to the very top */}
          {kit.id === 'ground' && ritualKit && (
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
            <div className="co-kit-name">{kit.name}</div>
            {inventoryAvailable === false && (
              <span style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#e05c5c', fontWeight: 600, border: '1px solid rgba(224,92,92,0.4)', padding: '3px 8px' }}>Sold Out</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
            <span className="co-price-main">£{kit.firstBoxPrice}</span>
            <span className="co-price-label">first box</span>
          </div>
          <div className="co-price-sub">Ships {fmtDay(dispatch)} · Arrives by {fmtDay(arrival)}</div>
          <div style={{ marginTop: 14 }}>
            <span className="co-price-sub">then £{kit.monthlyPrice}/mo</span>
          </div>
          <div className="co-price-refill">Charged {fmtDate(billing)} · Ships {fmtDate(refillShip)} · Arrives by {fmtDate(refillArrive)}</div>

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
                <span>First box ships within a week and lasts 4–6 weeks · refills ship on the 1st of each month</span>
              </div>
            </div>
          </div>

          <div className="co-divider" />

          <div className="co-section-label">What's in your box</div>
          <div className="co-product-list">
            {products.map(p => (
              <div key={p.num} className={`co-product${p.comingSoon ? ' dimmed' : ''}`}>
                <span className="co-product-num">{p.num}</span>
                <span>{p.name}{p.comingSoon ? ' *' : ''}</span>
              </div>
            ))}
          </div>
          {products.some(p => p.comingSoon) && (
            <div className="co-soon-note">* Coming soon — included when available</div>
          )}
        </div>

      </div>
    </>
  );
}
