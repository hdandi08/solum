const CSS = `
.sub-section{background:var(--black);padding:100px 48px;border-top:1px solid var(--line);}
.sub-inner{max-width:1400px;margin:0 auto;}
.sub-header{margin-bottom:64px;}
.sub-header .s-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.sub-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:16px;}
.sub-header p{font-size:17px;color:var(--mist);font-weight:300;line-height:1.7;max-width:560px;}
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
    products: 'Body Wash · Body Lotion · Bamboo Cloth',
    note: null,
    copy: 'The daily essentials. Always there when you need them.',
  },
  {
    label: 'Every 3 Months',
    products: 'Italy Towel Mitt · Back Scrub Cloth · Atlas Clay',
    note: '+ Argan Oil (RITUAL and SOVEREIGN)',
    copy: 'The tools and weekly ritual products. Refreshed before they degrade.',
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
  { name: 'SOVEREIGN', amount: '£58/mo', comingSoon: true },
];

export default function SubscriptionSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="sub-section" id="subscription">
        <div className="sub-inner">
          <div className="sub-header reveal">
            <div className="s-sec-tag">The Subscription</div>
            <h2>Your System<br />On Autopilot.</h2>
            <p>
              Pay once for your kit. After that, only what runs out arrives at your door.
              Flat monthly price — regardless of which box ships that month.
            </p>
          </div>
          <div className="sub-grid">
            <div className="cadence-list reveal">
              {CADENCE.map(c => (
                <div key={c.label} className="cadence-item">
                  <div className="cadence-label">{c.label}</div>
                  <div className="cadence-products">{c.products}</div>
                  {c.note && <div className="cadence-note">{c.note}</div>}
                  <div className="cadence-copy">{c.copy}</div>
                </div>
              ))}
            </div>
            <div className="pricing-panel reveal">
              <div className="pricing-panel-title">Monthly Price</div>
              <div className="price-rows">
                {PRICES.map(p => (
                  <div key={p.name} className={`price-row-item${p.comingSoon ? ' coming' : ''}`}>
                    <div>
                      <div className="price-row-kit">{p.name}</div>
                      {p.comingSoon && <div className="price-row-note">Coming soon</div>}
                    </div>
                    <div className="price-row-amount">{p.amount}</div>
                  </div>
                ))}
              </div>
              <div className="sub-footnote">
                First box is a one-time purchase. Subscription starts with your second delivery.
                Cancel any time — no penalty, no phone calls.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
