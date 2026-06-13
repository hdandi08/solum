import { useState } from 'react';

const CSS = `
.sub-section{background:var(--black);padding:100px 48px;border-top:1px solid var(--line);}
.sub-inner{max-width:1400px;margin:0 auto;}
.sub-header{margin-bottom:64px;}
.sub-header .s-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#c8a96e;font-weight:600;margin-bottom:16px;}
.sub-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:16px;}
.sub-header p{font-size:17px;color:var(--mist);font-weight:300;line-height:1.7;max-width:560px;}
.sub-coming-badge{display:inline-block;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#c8a96e;border:1px solid rgba(200,169,110,0.35);padding:5px 12px;margin-bottom:20px;font-weight:700;}
.sub-early-access{margin-top:24px;border:1px solid rgba(200,169,110,0.25);background:rgba(200,169,110,0.04);padding:24px;}
.sub-early-access-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#c8a96e;font-weight:600;margin-bottom:8px;}
.sub-early-access-body{font-size:14px;color:var(--stone);font-weight:300;line-height:1.6;margin-bottom:16px;}
.sub-ea-form{display:flex;gap:0;flex-direction:column;}
.sub-ea-input{background:var(--dark);border:1px solid var(--lineb);border-bottom:none;color:var(--bone);padding:13px 16px;font-family:'Barlow Condensed',sans-serif;font-size:15px;outline:none;transition:border-color .2s;box-sizing:border-box;}
.sub-ea-input:focus{border-color:rgba(200,169,110,0.5);}
.sub-ea-input::placeholder{color:rgba(168,180,188,0.4);}
.sub-ea-btn{background:#c8a96e;color:#08090b;border:none;font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:.12em;padding:14px 20px;cursor:pointer;transition:background .2s;}
.sub-ea-btn:hover:not(:disabled){background:#d9bc88;}
.sub-ea-btn:disabled{opacity:.6;cursor:default;}
.sub-ea-success{font-size:14px;color:#c8a96e;font-weight:500;padding:14px 0;}
.sub-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.cadence-list{display:flex;flex-direction:column;gap:1px;background:var(--line);}
.cadence-item{background:var(--char);padding:32px 36px;}
.cadence-label{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:8px;}
.cadence-products{font-size:16px;color:var(--bone);font-weight:500;margin-bottom:8px;line-height:1.4;}
.cadence-note{font-size:13px;color:var(--stone);font-weight:300;margin-bottom:6px;}
.cadence-copy{font-size:15px;color:var(--mist);font-weight:300;line-height:1.6;}
.pricing-panel{display:flex;flex-direction:column;gap:0;}
.pricing-panel-title{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.06em;color:var(--bone);margin-bottom:24px;}
.price-rows{display:flex;flex-direction:column;gap:1px;background:var(--line);margin-bottom:32px;}
.price-row-item{background:var(--char);padding:24px 28px;display:flex;justify-content:space-between;align-items:center;}
.price-row-item.coming .price-row-kit,.price-row-item.coming .price-row-amount{opacity:0.5;}
.price-row-kit{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.price-row-amount{font-family:'Bebas Neue',sans-serif;font-size:36px;color:var(--bone);letter-spacing:-.5px;}
.price-row-note{font-size:12px;color:var(--stone);font-weight:300;margin-top:2px;text-align:right;}
.sub-footnote{font-size:15px;color:var(--stone);font-weight:300;line-height:1.7;border-left:2px solid var(--blue);padding-left:20px;}
@media(max-width:768px){.sub-grid{grid-template-columns:1fr;gap:48px;}.sub-section{padding:60px 24px;}}
`;

const CADENCE = [
  {
    label: 'Every Month',
    products: 'Body Wash · Body Lotion · Cleansing Cloth · Italy Towel Mitt · Atlas Clay',
    note: '+ Argan Body Oil (RITUAL only)',
    copy: 'Everything that depletes or wears within a month. Always fresh, always ready.',
  },
  {
    label: 'Every 3 Months',
    products: 'Back Scrub Cloth',
    note: null,
    copy: 'The back cloth takes more friction than anything else. Replaced before it loses effectiveness.',
  },
  {
    label: 'Every 6 Months',
    products: 'Scalp Massager',
    note: null,
    copy: 'Silicone nubs wear down. A fresh one ships automatically.',
  },
];

const PRICES = [
  { name: 'GROUND', amount: '£38/mo', comingSoon: false },
  { name: 'RITUAL', amount: '£48/mo', comingSoon: false },
  { name: 'SOVEREIGN', amount: '£58/mo', comingSoon: false },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function SubscriptionSection() {
  const [email, setEmail] = useState('');
  const [eaState, setEaState] = useState('idle'); // idle | submitting | done | error

  async function handleEarlyAccess(e) {
    e.preventDefault();
    if (!email || eaState !== 'idle') return;
    setEaState('submitting');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/join-waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ email, source: 'subscription-section' }),
      });
      if (!res.ok) throw new Error();
      setEaState('done');
    } catch {
      setEaState('error');
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <section className="sub-section" id="subscription">
        <div className="sub-inner">
          <div className="sub-header reveal">
            <div className="s-sec-tag">Coming Soon</div>
            <h2>Subscription.<br />On Autopilot.</h2>
            <p>
              We are launching as a one-time purchase. Subscription is coming. Join the early access list to be first.
            </p>
          </div>
          <div className="sub-grid">
            <div className="reveal">
              <div className="sub-coming-badge">Coming Soon</div>
              <p style={{ fontSize: '15px', color: 'var(--stone)', fontWeight: 300, lineHeight: 1.7, marginBottom: '20px' }}>
                This is how the subscription will work. Pay once for your kit. After that, only what runs out arrives at your door — at a flat monthly price, regardless of which box ships that month.
              </p>
              <div className="cadence-list">
                {CADENCE.map(c => (
                  <div key={c.label} className="cadence-item">
                    <div className="cadence-label">{c.label}</div>
                    <div className="cadence-products">{c.products}</div>
                    {c.note && <div className="cadence-note">{c.note}</div>}
                    <div className="cadence-copy">{c.copy}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pricing-panel reveal">
              <div className="sub-coming-badge" style={{ marginBottom: '16px' }}>Subscription Coming Soon</div>
              <div className="pricing-panel-title">Monthly Price</div>
              <div className="price-rows">
                {PRICES.map(p => (
                  <div key={p.name} className="price-row-item">
                    <div className="price-row-kit">{p.name}</div>
                    <div className="price-row-amount">{p.amount}</div>
                  </div>
                ))}
              </div>
              <div className="sub-footnote" style={{ marginBottom: '24px' }}>
                Right now, SOLUM is available as a one-time purchase only. Subscription is coming soon: refills that arrive automatically before you run out. Join the early access list and we will notify you the moment it launches.
              </div>
              <div className="sub-early-access">
                <div className="sub-early-access-label">Early Access</div>
                <div className="sub-early-access-body">Be first to know when subscription launches.</div>
                {eaState === 'done' ? (
                  <div className="sub-ea-success">You're on the list. We'll be in touch.</div>
                ) : (
                  <form className="sub-ea-form" onSubmit={handleEarlyAccess}>
                    <input
                      className="sub-ea-input"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                    <button className="sub-ea-btn" type="submit" disabled={eaState === 'submitting'}>
                      {eaState === 'submitting' ? 'Adding...' : 'Join Early Access →'}
                    </button>
                    {eaState === 'error' && (
                      <div style={{ fontSize: '13px', color: '#e05c5c', marginTop: '8px' }}>Something went wrong. Try again.</div>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
