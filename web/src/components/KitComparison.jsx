import { useState } from 'react';
import { KITS } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const CSS = `
.kits-section{background:var(--black);padding:100px 48px;border-top:1px solid var(--line);}
.kits-inner{max-width:1400px;margin:0 auto;}
.kits-header{margin-bottom:64px;}
.kits-header .k-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:16px;}
.kits-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:16px;}
.kits-header p{font-size:17px;color:var(--mist);font-weight:300;line-height:1.7;max-width:560px;}
.kits-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);}
.kit-card{background:var(--char);padding:40px 32px;display:flex;flex-direction:column;position:relative;}
.kit-card.featured{background:var(--mid);border:1px solid var(--blue);outline:1px solid rgba(46,109,164,0.3);margin:-1px;}
.kit-badge{display:inline-block;font-size:10px;letter-spacing:4px;text-transform:uppercase;padding:4px 10px;margin-bottom:16px;font-weight:700;}
.kit-badge.popular{background:var(--blue);color:var(--bone);}
.kit-badge.soon{background:var(--char);color:var(--stone);border:1px solid var(--lineb);}
.kit-name{font-family:'Bebas Neue',sans-serif;font-size:48px;letter-spacing:.06em;color:var(--bone);line-height:1;margin-bottom:8px;}
.kit-tagline{font-size:15px;color:var(--stone);font-weight:300;line-height:1.5;margin-bottom:32px;}
.kit-prices{margin-bottom:32px;}
.kit-price-first{display:flex;align-items:baseline;gap:8px;margin-bottom:8px;}
.kit-price-first-amount{font-family:'Bebas Neue',sans-serif;font-size:52px;color:var(--bone);letter-spacing:-1px;line-height:1;}
.kit-price-first-label{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
.kit-price-sub{font-size:15px;color:var(--mist);font-weight:300;}
.kit-price-sub span{color:var(--blit);font-weight:500;}
.kit-divider{width:100%;height:1px;background:var(--line);margin-bottom:24px;}
.kit-products{display:flex;flex-direction:column;gap:8px;margin-bottom:32px;flex:1;}
.kit-product{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--mist);font-weight:300;}
.kit-product-num{font-size:10px;letter-spacing:2px;color:var(--blue);font-weight:600;min-width:24px;}
.kit-product-coming{opacity:0.55;}
.kit-product-replacement{font-size:12px;color:var(--stone);font-style:italic;margin-top:4px;padding-left:32px;}
.kit-cta{display:block;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.12em;text-align:center;padding:16px 24px;text-decoration:none;transition:background .2s,transform .15s;margin-top:auto;border:none;cursor:pointer;width:100%;}
.kit-cta.active{background:var(--bone);color:var(--black);}
.kit-cta.active:hover{background:#fff;transform:translateY(-1px);}
.kit-cta.active:disabled{background:var(--stone);cursor:wait;transform:none;}
.kit-cta.inactive{background:var(--char);color:var(--stone);border:1px solid var(--lineb);cursor:default;}
.kits-footnote{text-align:center;margin-top:32px;font-size:15px;color:var(--stone);font-weight:300;line-height:1.6;}
@media(max-width:768px){.kits-grid{grid-template-columns:1fr;}.kits-section{padding:60px 24px;}.kit-card.featured{margin:0;}}

/* Checkout modal */
.co-overlay{position:fixed;inset:0;background:rgba(8,9,11,0.88);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;}
.co-modal{background:var(--char);border:1px solid var(--lineb);max-width:480px;width:100%;padding:40px;}
.co-kit-name{font-family:'Bebas Neue',sans-serif;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);margin-bottom:8px;}
.co-title{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:8px;}
.co-sub{font-size:15px;color:var(--stone);font-weight:300;margin-bottom:32px;line-height:1.5;}
.co-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.co-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
.co-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.co-input{background:var(--dark);border:1px solid var(--lineb);color:var(--bone);padding:12px 14px;font-family:'Barlow Condensed',sans-serif;font-size:15px;outline:none;transition:border-color .2s;}
.co-input:focus{border-color:var(--blue);}
.co-input::placeholder{color:var(--stone);}
.co-optional{font-size:11px;color:var(--stone);margin-bottom:4px;opacity:0.7;}
.co-actions{display:flex;gap:12px;margin-top:24px;}
.co-submit{flex:1;background:var(--bone);color:var(--black);border:none;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.12em;padding:16px;cursor:pointer;transition:background .2s;}
.co-submit:hover{background:#fff;}
.co-submit:disabled{background:var(--stone);cursor:wait;}
.co-cancel{background:transparent;color:var(--stone);border:1px solid var(--lineb);font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;padding:16px 20px;cursor:pointer;transition:color .2s;}
.co-cancel:hover{color:var(--bone);}
.co-error{font-size:13px;color:#e05c5c;margin-top:12px;line-height:1.5;}
`;

export default function KitComparison() {
  const [modal, setModal]     = useState(null); // kit object or null
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState({ first_name: '', last_name: '', email: '', birth_year: '', birth_month: '' });

  function openModal(kit) {
    setModal(kit);
    setError('');
    setForm({ first_name: '', last_name: '', email: '', birth_year: '', birth_month: '' });
  }

  function closeModal() { setModal(null); setError(''); }

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.email.trim()) {
      setError('First name and email are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({
          kit_id:      modal.id,
          email:       form.email.trim(),
          first_name:  form.first_name.trim(),
          last_name:   form.last_name.trim() || null,
          birth_year:  form.birth_year  ? parseInt(form.birth_year)  : null,
          birth_month: form.birth_month ? parseInt(form.birth_month) : null,
          success_url: `${window.location.origin}/success?kit=${modal.id}`,
          cancel_url:  `${window.location.origin}/#kits`,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Something went wrong.');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <>
      <style>{CSS}</style>

      <section className="kits-section" id="kits">
        <div className="kits-inner">
          <div className="kits-header reveal">
            <div className="k-sec-tag">Choose Your Kit</div>
            <h2>Three Tiers.<br />One System.</h2>
            <p>All three kits get your back clean and your skin working. RITUAL adds the oil treatment that changes what your skin feels like long-term. Pick the depth you want.</p>
          </div>
          <div className="kits-grid reveal">
            {KITS.map(kit => {
              const products = PRODUCTS.filter(p => kit.productNums.includes(p.num));
              const isSovereign = kit.id === 'sovereign';
              return (
                <div key={kit.id} className={`kit-card${kit.popular ? ' featured' : ''}${kit.comingSoon ? ' coming' : ''}`}>
                  {kit.popular    && <span className="kit-badge popular">Most Popular</span>}
                  {kit.comingSoon && <span className="kit-badge soon">Coming Soon</span>}
                  <div className="kit-name">{kit.name}</div>
                  <div className="kit-tagline">{kit.tagline}</div>
                  <div className="kit-prices">
                    <div className="kit-price-first">
                      <span className="kit-price-first-amount">£{kit.firstBoxPrice}</span>
                      <span className="kit-price-first-label">first box</span>
                    </div>
                    <div className="kit-price-sub">
                      then <span>£{kit.monthlyPrice}/mo</span>
                      {kit.comingSoon ? ' when available' : ' · cancel any time'}
                    </div>
                  </div>
                  <div className="kit-divider" />
                  <div className="kit-products">
                    {products.map(p => (
                      <div key={p.num} className={`kit-product${p.comingSoon ? ' kit-product-coming' : ''}`}>
                        <span className="kit-product-num">{p.num}</span>
                        <span>{p.name}{p.comingSoon ? ' *' : ''}</span>
                      </div>
                    ))}
                    {isSovereign && (
                      <div className="kit-product-replacement">
                        * Turkish Kese Mitt replaces Italy Towel Mitt · Beidi Black Soap — both coming soon
                      </div>
                    )}
                  </div>
                  {kit.comingSoon ? (
                    <span className="kit-cta inactive">Coming Soon</span>
                  ) : (
                    <button className="kit-cta active" onClick={() => openModal(kit)}>
                      Start with {kit.name}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="kits-footnote">
            First box is a one-time purchase. Subscription starts with your second delivery. Cancel any time.
          </p>
        </div>
      </section>

      {modal && (
        <div className="co-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="co-modal">
            <div className="co-kit-name">{modal.name} · £{modal.firstBoxPrice} first box</div>
            <div className="co-title">Almost there.</div>
            <div className="co-sub">We need a couple of details before we take you to checkout.</div>
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
              <div className="co-optional">Optional — helps us understand our customers</div>
              <div className="co-row">
                <div className="co-field">
                  <label className="co-label">Birth Year</label>
                  <input className="co-input" type="number" min="1940" max="2006" value={form.birth_year} onChange={set('birth_year')} placeholder="1990" />
                </div>
                <div className="co-field">
                  <label className="co-label">Birth Month</label>
                  <input className="co-input" type="number" min="1" max="12" value={form.birth_month} onChange={set('birth_month')} placeholder="6" />
                </div>
              </div>
              {error && <div className="co-error">{error}</div>}
              <div className="co-actions">
                <button type="button" className="co-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="co-submit" disabled={loading}>
                  {loading ? 'Redirecting…' : 'Go to Checkout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
