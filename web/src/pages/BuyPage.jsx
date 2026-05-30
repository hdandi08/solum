import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KITS } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const PREMIUM_SOURCES = ['gift', 'tiktok_shop'];

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
  const d = new Date(dispatch);
  d.setDate(d.getDate() + 2);
  return d;
}

function fmtDay(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
.by-page{min-height:100vh;background:var(--black);display:grid;grid-template-columns:1fr 420px;gap:0;padding-top:64px;}
.by-left{padding:64px 56px 80px;border-right:1px solid var(--line);}
.by-right{padding:48px 40px;position:sticky;top:64px;align-self:start;height:calc(100vh - 64px);overflow-y:auto;background:var(--char);border-left:1px solid var(--lineb);}

/* Back link */
.by-back{display:inline-flex;align-items:center;gap:8px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);text-decoration:none;margin-bottom:48px;transition:color .2s;}
.by-back:hover{color:var(--bone);}

/* Headings */
.by-eyebrow{font-size:13px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:12px;}
.by-heading{font-family:'Bebas Neue',sans-serif;font-size:clamp(42px,5vw,72px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:10px;}
.by-subhead{font-size:16px;color:var(--stone);font-weight:300;margin-bottom:36px;line-height:1.5;}

/* Kit cards */
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
.by-form{display:flex;flex-direction:column;gap:16px;max-width:480px;}
.by-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.by-field{display:flex;flex-direction:column;gap:7px;}
.by-label{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.by-input{background:var(--dark);border:1px solid var(--lineb);color:var(--bone);padding:14px 16px;font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:300;outline:none;transition:border-color .2s;width:100%;box-sizing:border-box;}
.by-input:focus{border-color:var(--blue);}
.by-input::placeholder{color:rgba(168,180,188,0.4);}
.by-submit{width:100%;background:var(--bone);color:var(--black);border:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.15em;padding:18px;cursor:pointer;transition:background .2s,transform .15s;margin-top:6px;}
.by-submit:hover:not(:disabled){background:#fff;transform:translateY(-1px);}
.by-submit:disabled{background:var(--stone);cursor:wait;}
.by-error{font-size:14px;color:#e05c5c;margin-top:4px;line-height:1.5;padding:12px 16px;border:1px solid rgba(224,92,92,0.3);background:rgba(224,92,92,0.05);}
.by-secure{font-size:13px;color:var(--stone);font-weight:300;margin-top:14px;text-align:center;line-height:1.6;}
.by-stripe-badge{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:12px;padding:10px 16px;border:1px solid rgba(99,91,255,0.2);background:rgba(99,91,255,0.04);}
.by-stripe-text{font-size:12px;color:var(--stone);font-weight:300;letter-spacing:.5px;}
.by-stripe-logo{font-size:13px;font-weight:700;letter-spacing:-.5px;color:#a09bff;}

/* Waitlist */
.by-waitlist-block{border:1px solid var(--lineb);background:rgba(46,109,164,0.04);padding:28px 28px 24px;max-width:480px;}
.by-waitlist-eyebrow{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:#e05c5c;font-weight:600;margin-bottom:12px;}
.by-waitlist-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,5vw,52px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:10px;}
.by-waitlist-body{font-size:15px;color:var(--stone);font-weight:300;line-height:1.6;margin-bottom:24px;}
.by-waitlist-cta{display:block;text-align:center;text-decoration:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.12em;background:var(--bone);color:var(--black);padding:18px 40px;}

/* Right panel */
.by-kit-name-lg{font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:.05em;color:var(--bone);line-height:1;margin-bottom:4px;}
.by-price-row{display:flex;align-items:baseline;gap:6px;margin-top:8px;}
.by-price-main{font-family:'Bebas Neue',sans-serif;font-size:56px;color:var(--bone);letter-spacing:-1px;line-height:1;}
.by-price-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);}
.by-ship-line{font-size:15px;color:var(--stone);font-weight:300;margin-top:5px;line-height:1.5;}
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
  .by-page{grid-template-columns:1fr;padding-top:64px;}
  .by-right{position:static;height:auto;border-left:none;border-bottom:1px solid var(--lineb);padding:28px 24px;}
  .by-left{padding:36px 24px 64px;border-right:none;}
}
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function BuyPage() {
  const [params] = useSearchParams();

  // Normalise URL param: ?source=tiktok → 'tiktok_shop' (canonical DB value)
  const rawSource = params.get('source');
  const source = rawSource === 'tiktok' ? 'tiktok_shop' : (rawSource ?? 'first_batch');
  const preselect = params.get('kit');

  const isPremium = PREMIUM_SOURCES.includes(source);
  const isFirstBatch = source === 'first_batch';

  const [inventory, setInventory] = useState(null);
  const [selectedKit, setSelectedKit] = useState(preselect ?? 'ritual');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dispatch = getDispatchDate();
  const arrival = getArrivalDate(dispatch);

  const authHeaders = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
  };

  useEffect(() => {
    fetch(`${SUPABASE_URL}/functions/v1/get-inventory-status`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => setInventory(d.kits ?? {}))
      .catch(() => setInventory({}));
  }, []); // eslint-disable-line

  const bothSoldOut = inventory && !inventory.ground?.available && !inventory.ritual?.available;

  const firstBatchPrices = { ground: 65, ritual: 85 };
  const premiumPrices    = { ground: 75, ritual: 95 };
  const prices = isPremium ? premiumPrices : firstBatchPrices;

  const kitDef = KITS.find(k => k.id === selectedKit);
  const totalRemaining = (inventory?.ground?.count ?? 0) + (inventory?.ritual?.count ?? 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedKit || loading) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-first-box-session`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kit_id: selectedKit,
          email: form.email,
          first_name: form.firstName,
          last_name: form.lastName,
          source,
          success_url: `${window.location.origin}/success?kit=${selectedKit}`,
          cancel_url: window.location.href,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.message ?? data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Right summary panel ───────────────────────────────────────────────────

  const RightPanel = () => {
    const activeKit = KITS.find(k => k.id === selectedKit) ?? KITS[1];
    const activePrice = prices[activeKit.id] ?? prices.ritual;
    const activeProducts = PRODUCTS.filter(
      p => activeKit.productNums.includes(p.num) && !p.comingSoon,
    );

    return (
      <div className="by-right">
        <div className="by-kit-name-lg">{activeKit.name}</div>
        <div className="by-price-row">
          <span className="by-price-main">£{activePrice}</span>
          <span className="by-price-label">one-time</span>
        </div>
        <div className="by-ship-line">Ships {fmtDay(dispatch)} · Arrives by {fmtDay(arrival)}</div>
        <div className="by-ship-line">Royal Mail Tracked 48 · UK only</div>

        {isFirstBatch && inventory && (
          <div className="by-stock-pill">
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
              <span>Ritual card in every box — daily and weekly step-by-step guide</span>
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

  // ── Page ──────────────────────────────────────────────────────────────────

  const eyebrow = isFirstBatch
    ? '250 Kits · No Subscription Required'
    : source === 'gift'
    ? 'Gift Purchase · One-Time'
    : 'One-Time Purchase · No Commitment';

  return (
    <>
      <style>{CSS}</style>
      <div className="by-page">

        {/* Left — form */}
        <div className="by-left">
          <a className="by-back" href="/#kits">← Back to kits</a>

          {bothSoldOut ? (
            <div className="by-waitlist-block">
              <div className="by-waitlist-eyebrow">Sold Out</div>
              <div className="by-waitlist-title">All 250<br />claimed.</div>
              <div className="by-waitlist-body">
                The first batch is gone. Leave your email and you'll be first to know when we restock with 1,000+ units.
              </div>
              <a
                href="mailto:contact@bysolum.co.uk?subject=Restock%20Waitlist"
                className="by-waitlist-cta"
              >
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
              <form className="by-form" onSubmit={handleSubmit}>
                <div className="by-row">
                  <div className="by-field">
                    <label className="by-label">First Name</label>
                    <input
                      className="by-input"
                      type="text"
                      required
                      placeholder="James"
                      value={form.firstName}
                      onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="by-field">
                    <label className="by-label">Last Name</label>
                    <input
                      className="by-input"
                      type="text"
                      placeholder="Smith"
                      value={form.lastName}
                      onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="by-field">
                  <label className="by-label">Email</label>
                  <input
                    className="by-input"
                    type="email"
                    required
                    placeholder="james@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>

                {error && <div className="by-error">{error}</div>}

                <button
                  className="by-submit"
                  type="submit"
                  disabled={loading || !selectedKit}
                >
                  {loading
                    ? 'Redirecting to payment…'
                    : `Get ${kitDef?.name ?? ''} Kit — £${prices[selectedKit]} →`}
                </button>

                <div className="by-secure">
                  By ordering you agree to our{' '}
                  <a href="/terms" style={{ color: 'var(--stone)' }}>Terms</a>
                  {' '}and{' '}
                  <a href="/privacy" style={{ color: 'var(--stone)' }}>Privacy Policy</a>
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

        {/* Right — summary */}
        <RightPanel />
      </div>
    </>
  );
}
