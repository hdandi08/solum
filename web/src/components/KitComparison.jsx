import { KITS } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';

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
.kit-cta{display:block;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.12em;text-align:center;padding:16px 24px;text-decoration:none;transition:background .2s,transform .15s;margin-top:auto;}
.kit-cta.active{background:var(--blue);color:var(--bone);}
.kit-cta.active:hover{background:var(--blit);transform:translateY(-1px);}
.kit-cta.inactive{background:var(--char);color:var(--stone);border:1px solid var(--lineb);cursor:default;}
.kits-footnote{text-align:center;margin-top:32px;font-size:15px;color:var(--stone);font-weight:300;line-height:1.6;}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
@media(max-width:768px){.kits-grid{grid-template-columns:1fr;}.kits-section{padding:60px 24px;}.kit-card.featured{margin:0;}}
`;

export default function KitComparison() {
  return (
    <>
      <style>{CSS}</style>
      <section className="kits-section" id="kits">
        <div className="kits-inner">
          <div className="kits-header reveal">
            <div className="k-sec-tag">Choose Your Kit</div>
            <h2>Three Tiers.<br />One System.</h2>
            <p>Every kit runs the same two rituals. The difference is which products are included and how deep you go.</p>
          </div>
          <div className="kits-grid reveal">
            {KITS.map(kit => {
              const products = PRODUCTS.filter(p => kit.productNums.includes(p.num));
              const isSovereign = kit.id === 'sovereign';

              return (
                <div
                  key={kit.id}
                  className={`kit-card${kit.popular ? ' featured' : ''}${kit.comingSoon ? ' coming' : ''}`}
                >
                  {kit.popular && <span className="kit-badge popular">Most Popular</span>}
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
                    <a href="#" className="kit-cta active">Start with {kit.name}</a>
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
    </>
  );
}
