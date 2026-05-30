import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const KIT_CONFIG = {
  ground: {
    name: 'GROUND',
    tagline: 'Properly clean for the first time. Dead skin gone. Your back actually clean.',
    firstBatchPrice: 65,
    premiumPrice: 75,
  },
  ritual: {
    name: 'RITUAL',
    tagline: 'Everything in GROUND plus the oil ritual. Skin that stays fed all day.',
    firstBatchPrice: 85,
    premiumPrice: 95,
    popular: true,
  },
};

const PREMIUM_SOURCES = ['gift', 'tiktok_shop'];

const CSS = `
.buy-page{min-height:100vh;background:var(--black,#08090B);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:80px 24px 60px;color:var(--bone,#F0ECE2);}
.buy-logo{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.15em;color:var(--bone,#F0ECE2);margin-bottom:48px;text-decoration:none;display:block;text-align:center;}
.buy-heading{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,5vw,56px);letter-spacing:.06em;text-align:center;line-height:1;margin-bottom:8px;}
.buy-subhead{font-size:15px;font-weight:300;color:#8b93a0;text-align:center;margin-bottom:48px;letter-spacing:.5px;}
.buy-stock{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(46,109,164,0.4);padding:8px 16px;margin-bottom:40px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#4A8FC7;}
.buy-stock-dot{width:6px;height:6px;border-radius:50%;background:#4A8FC7;animation:pulse 2s ease infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
.buy-kits{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(255,255,255,0.06);max-width:720px;width:100%;margin-bottom:40px;}
@media(max-width:560px){.buy-kits{grid-template-columns:1fr;}}
.buy-kit{background:#0e1117;padding:32px 28px;cursor:pointer;position:relative;transition:background .15s;}
.buy-kit:hover{background:#131820;}
.buy-kit.selected{background:#0e1821;outline:2px solid #2E6DA4;}
.buy-kit.soldout{opacity:.5;cursor:default;}
.buy-kit-badge{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#4A8FC7;font-weight:700;margin-bottom:12px;display:block;}
.buy-kit-name{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.06em;line-height:1;margin-bottom:8px;}
.buy-kit-tagline{font-size:13px;font-weight:300;color:#8b93a0;line-height:1.5;margin-bottom:20px;}
.buy-kit-price{font-family:'Bebas Neue',sans-serif;font-size:44px;letter-spacing:-1px;line-height:1;}
.buy-kit-price-label{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#8b93a0;margin-top:4px;}
.buy-kit-soldout{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#555;margin-top:8px;}
.buy-form{max-width:420px;width:100%;display:flex;flex-direction:column;gap:14px;}
.buy-form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.buy-field{display:flex;flex-direction:column;gap:6px;}
.buy-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8b93a0;font-weight:600;}
.buy-input{background:#0e1117;border:1px solid rgba(255,255,255,0.1);color:var(--bone,#F0ECE2);padding:13px 16px;font-size:15px;font-weight:300;outline:none;transition:border-color .15s;width:100%;box-sizing:border-box;}
.buy-input:focus{border-color:#2E6DA4;}
.buy-input::placeholder{color:#555;}
.buy-submit{font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.12em;background:var(--bone,#F0ECE2);color:#08090B;padding:18px 40px;border:none;cursor:pointer;width:100%;margin-top:8px;transition:background .15s,transform .12s;}
.buy-submit:hover:not(:disabled){background:#fff;transform:translateY(-1px);}
.buy-submit:disabled{opacity:.5;cursor:default;}
.buy-error{font-size:13px;color:#e05555;text-align:center;margin-top:4px;}
.buy-secure{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#444;text-align:center;margin-top:16px;}
.buy-waitlist{max-width:420px;width:100%;text-align:center;}
.buy-waitlist h2{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.06em;margin-bottom:12px;}
.buy-waitlist p{font-size:15px;font-weight:300;color:#8b93a0;line-height:1.6;margin-bottom:28px;}
`;

export default function BuyPage() {
  const [params] = useSearchParams();
  const source = params.get('source') ?? 'first_batch';
  const preselect = params.get('kit');

  const isPremium = PREMIUM_SOURCES.includes(source);
  const isFirstBatch = !isPremium;

  const [inventory, setInventory] = useState(null); // { ground: {available,count}, ritual: {available,count} }
  const [selectedKit, setSelectedKit] = useState(preselect ?? 'ritual');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${SUPABASE_URL}/functions/v1/get-inventory-status`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    })
      .then(r => r.json())
      .then(d => setInventory(d.kits ?? {}))
      .catch(() => setInventory({}));
  }, []);

  const bothSoldOut = inventory &&
    !inventory.ground?.available &&
    !inventory.ritual?.available;

  const selectedPrice = selectedKit
    ? (isPremium
        ? KIT_CONFIG[selectedKit].premiumPrice
        : KIT_CONFIG[selectedKit].firstBatchPrice)
    : null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedKit || loading) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-first-box-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
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

  const totalGroundCount = (inventory?.ground?.count ?? 0) + (inventory?.ritual?.count ?? 0);

  return (
    <>
      <style>{CSS}</style>
      <div className="buy-page">
        <a href="/" className="buy-logo">SOLUM</a>

        {bothSoldOut ? (
          <div className="buy-waitlist">
            <h2>Sold Out.</h2>
            <p>All 250 first-batch kits have been claimed. Leave your email and you'll be first to know when we restock.</p>
            {/* Waitlist email capture — simple mailto for now */}
            <a href="mailto:contact@bysolum.co.uk?subject=Restock%20Waitlist" className="buy-submit" style={{display:'block',textAlign:'center',textDecoration:'none',fontFamily:"'Bebas Neue',sans-serif",fontSize:'17px',letterSpacing:'.12em',background:'#F0ECE2',color:'#08090B',padding:'18px 40px'}}>
              JOIN WAITLIST
            </a>
          </div>
        ) : (
          <>
            <h1 className="buy-heading">
              {isFirstBatch ? '250 Kits. No Subscription.' : 'Get Your Kit.'}
            </h1>
            <p className="buy-subhead">
              {isFirstBatch
                ? 'One-time purchase. No commitment. Start the ritual.'
                : 'One-time purchase. Subscribe anytime after.'}
            </p>

            {isFirstBatch && inventory && (
              <div className="buy-stock">
                <span className="buy-stock-dot" />
                {totalGroundCount} of 250 remaining
              </div>
            )}

            <div className="buy-kits">
              {Object.entries(KIT_CONFIG).map(([id, kit]) => {
                const stock = inventory?.[id];
                const available = !inventory || stock?.available;
                const price = isPremium ? kit.premiumPrice : kit.firstBatchPrice;
                return (
                  <div
                    key={id}
                    className={`buy-kit${selectedKit === id ? ' selected' : ''}${!available ? ' soldout' : ''}`}
                    onClick={() => available && setSelectedKit(id)}
                  >
                    {kit.popular && <span className="buy-kit-badge">Most Popular</span>}
                    <div className="buy-kit-name">{kit.name}</div>
                    <div className="buy-kit-tagline">{kit.tagline}</div>
                    <div className="buy-kit-price">£{price}</div>
                    <div className="buy-kit-price-label">one-time</div>
                    {!available && <div className="buy-kit-soldout">Sold Out</div>}
                  </div>
                );
              })}
            </div>

            <form className="buy-form" onSubmit={handleSubmit}>
              <div className="buy-form-row">
                <div className="buy-field">
                  <label className="buy-label">First Name</label>
                  <input
                    className="buy-input"
                    type="text"
                    required
                    placeholder="James"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div className="buy-field">
                  <label className="buy-label">Last Name</label>
                  <input
                    className="buy-input"
                    type="text"
                    placeholder="Smith"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="buy-field">
                <label className="buy-label">Email</label>
                <input
                  className="buy-input"
                  type="email"
                  required
                  placeholder="james@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>

              {error && <div className="buy-error">{error}</div>}

              <button
                className="buy-submit"
                type="submit"
                disabled={loading || !selectedKit}
              >
                {loading ? 'Redirecting...' : `Get ${selectedKit ? KIT_CONFIG[selectedKit].name : 'Kit'} — £${selectedPrice}`}
              </button>
              <div className="buy-secure">Secure checkout · Powered by Stripe</div>
            </form>
          </>
        )}
      </div>
    </>
  );
}
