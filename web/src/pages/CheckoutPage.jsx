import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { KITS } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';

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
.co-stripe-logo{font-size:13px;font-weight:700;letter-spacing:-.5px;color:#a09bff;}

/* Right — kit summary */
.co-kit-name{font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:.05em;color:var(--bone);line-height:1;margin-bottom:4px;}
.co-price-main{font-family:'Bebas Neue',sans-serif;font-size:56px;color:var(--bone);letter-spacing:-1px;line-height:1;}
.co-price-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);margin-left:4px;}
.co-price-sub{font-size:16px;color:var(--mist);font-weight:300;margin-top:4px;}
.co-price-day{font-size:14px;color:var(--stone);font-style:italic;margin-top:2px;}
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
.co-upgrade{border:1px solid var(--lineb);background:rgba(46,109,164,0.05);padding:20px;margin-top:24px;}
.co-upgrade-label{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:8px;}
.co-upgrade-copy{font-size:14px;color:var(--stone);font-weight:300;line-height:1.5;margin-bottom:14px;}
.co-upgrade-link{font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;color:var(--blit);text-decoration:none;transition:color .2s;}
.co-upgrade-link:hover{color:var(--bone);}

@media(max-width:900px){
  .co-page{grid-template-columns:1fr;padding-top:64px;}
  .co-right{position:static;height:auto;border-left:none;border-bottom:1px solid var(--lineb);}
  .co-left{padding:40px 24px 64px;}
  .co-right{padding:32px 24px;}
}
`;

export default function CheckoutPage() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const kitId       = params.get('kit');
  const kit         = KITS.find(k => k.id === kitId);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState({ first_name: '', last_name: '', email: '', birth_year: '', birth_month: '' });

  // Invalid kit — redirect to kits section
  if (!kit || kit.comingSoon) {
    navigate('/#kits');
    return null;
  }

  const products  = PRODUCTS.filter(p => kit.productNums.includes(p.num));
  const perDay    = (kit.monthlyPrice / 30).toFixed(2);
  const ritualKit = KITS.find(k => k.id === 'ritual');

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.first_name.trim()) { setError('First name is required.'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { setError('A valid email is required.'); return; }
    if (!form.birth_year) { setError('Birth year is required.'); return; }
    if (!form.birth_month) { setError('Birth month is required.'); return; }
    if (form.birth_year < 1940 || form.birth_year > 2006) { setError('Birth year must be between 1940 and 2006.'); return; }
    if (form.birth_month < 1 || form.birth_month > 12) { setError('Birth month must be between 1 and 12.'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          kit_id:      kit.id,
          email:       form.email.trim(),
          first_name:  form.first_name.trim(),
          last_name:   form.last_name.trim() || null,
          birth_year:  form.birth_year  ? parseInt(form.birth_year)  : null,
          birth_month: form.birth_month ? parseInt(form.birth_month) : null,
          success_url: `${window.location.origin}/success?kit=${kit.id}`,
          cancel_url:  `${window.location.origin}/checkout?kit=${kit.id}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Something went wrong. Please try again.');
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="co-page">

        {/* ── LEFT — FORM ── */}
        <div className="co-left">
          <a className="co-back" href="/full#kits">← Choose a different kit</a>
          <div className="co-eyebrow">{kit.name} · £{kit.firstBoxPrice} first box</div>
          <div className="co-heading">Start Your Ritual.</div>
          <div className="co-subhead">Takes 30 seconds. You'll be at Stripe in a moment.</div>

          <form onSubmit={handleSubmit} noValidate>
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

            {error && <div className="co-error">{error}</div>}

            <button type="submit" className="co-submit" disabled={loading}>
              {loading ? 'Redirecting to Stripe…' : `Go to Checkout — £${kit.firstBoxPrice} →`}
            </button>
            <div className="co-secure">We never share your data · Cancel any time</div>
            <div className="co-stripe-badge">
              <span className="co-stripe-lock">🔒</span>
              <span className="co-stripe-text">Payments secured by</span>
              <span className="co-stripe-logo">Stripe</span>
            </div>
          </form>
        </div>

        {/* ── RIGHT — KIT SUMMARY ── */}
        <div className="co-right">
          <div className="co-kit-name">{kit.name}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
            <span className="co-price-main">£{kit.firstBoxPrice}</span>
            <span className="co-price-label">first box</span>
          </div>
          <div className="co-price-sub">then £{kit.monthlyPrice}/mo</div>
          <div className="co-price-day">That's £{perDay} a day</div>

          <div className="co-divider" />

          {/* Upgrade nudge — GROUND only, shown before promise + product list */}
          {kit.id === 'ground' && ritualKit && (
            <>
              <div className="co-upgrade">
                <div className="co-upgrade-label">Most Popular</div>
                <div className="co-upgrade-copy">
                  Most customers upgrade to RITUAL. Adds argan body oil — the step that changes what your skin feels like long-term.
                </div>
                <a className="co-upgrade-link" href="/checkout?kit=ritual">
                  Upgrade to RITUAL — £{ritualKit.firstBoxPrice} first box →
                </a>
              </div>
              <div className="co-divider" />
            </>
          )}

          <div className="co-promise">
            <div className="co-promise-title">Our Promise</div>
            <div className="co-trust">
              <div className="co-trust-line">
                <span className="co-trust-check">✓</span>
                <span>Cancel any time — no questions asked</span>
              </div>
              <div className="co-trust-line">
                <span className="co-trust-check">✓</span>
                <span>No minimum term — leave after your first box if you want</span>
              </div>
              <div className="co-trust-line">
                <span className="co-trust-check">✓</span>
                <span>Pause or skip any month straight from your account</span>
              </div>
              <div className="co-trust-line">
                <span className="co-trust-check">✓</span>
                <span>Your consumables arrive before you run out — tools replaced when due</span>
              </div>
              <div className="co-trust-line">
                <span className="co-trust-check">✓</span>
                <span>Ships within a week of order</span>
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
