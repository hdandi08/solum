import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KITS } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';
import { capture } from '../lib/analytics.js';

const CSS = `
.kits-section{background:var(--black);padding:100px 48px;border-top:1px solid var(--line);}
.kits-inner{max-width:1400px;margin:0 auto;}
.kits-header{margin-bottom:64px;}
.kits-header .k-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.kits-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:16px;}
.kits-header p{font-size:17px;color:var(--mist);font-weight:300;line-height:1.7;max-width:560px;}
.kits-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);}
.kit-card{background:var(--char);padding:40px 32px;display:flex;flex-direction:column;position:relative;}
.kit-card.featured{background:var(--mid);border:1px solid var(--blue);outline:1px solid rgba(46,109,164,0.3);margin:-1px;}
/* kit image — full-bleed header on each kit card (RITUAL has a real photo; others a placeholder) */
.kit-image,.kit-image-ph{display:block;width:calc(100% + 64px);margin:-40px -32px 26px;aspect-ratio:5/3;object-fit:cover;border-bottom:1px solid var(--line);}
.kit-image-ph{display:flex;align-items:center;justify-content:center;background:repeating-linear-gradient(45deg,#0c0d11,#0c0d11 12px,#101218 12px,#101218 24px);color:var(--stone);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;text-align:center;padding:0 16px;}
.kit-card.featured .kit-image,.kit-card.featured .kit-image-ph{width:calc(100% + 64px);margin-left:-32px;margin-right:-32px;margin-top:-40px;}
@media(max-width:768px){
  .kit-image,.kit-image-ph{width:calc(100% + 48px);margin:-28px -24px 22px;}
}
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
.kit-product{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--mist);font-weight:300;}
.kit-product-num{font-size:10px;letter-spacing:2px;color:var(--blue);font-weight:600;min-width:20px;}
.kit-product-thumb-wrap{position:relative;flex-shrink:0;}
.kit-product-thumb{width:40px;height:52px;object-fit:cover;object-position:center;background:var(--dark);border:1px solid var(--line);flex-shrink:0;display:block;}
.kit-product-thumb-placeholder{width:40px;height:52px;background:var(--dark);border:1px solid var(--line);flex-shrink:0;}
.kit-product-preview{position:absolute;bottom:calc(100% + 12px);left:0;width:220px;height:275px;object-fit:cover;object-position:center;background:var(--dark);border:1px solid var(--line);box-shadow:0 12px 32px rgba(0,0,0,0.6);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s ease;z-index:50;}
.kit-product-thumb-wrap.flip-left .kit-product-preview{left:auto;right:0;}
.kit-product-thumb-wrap:hover .kit-product-preview{opacity:1;visibility:visible;}
.kit-product-coming{opacity:0.55;}
.kit-product-replacement{font-size:12px;color:var(--stone);font-style:italic;margin-top:4px;padding-left:32px;}
.kit-cta{display:block;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.12em;text-align:center;padding:16px 24px;transition:background .2s,transform .15s;margin-top:auto;border:none;cursor:pointer;width:100%;}
.kit-cta.active{background:var(--bone);color:var(--black);}
.kit-cta.active:hover{background:#fff;transform:translateY(-1px);}
.kit-cta.inactive{background:var(--char);color:var(--stone);border:1px solid var(--lineb);cursor:default;}
.kits-footnote{text-align:center;margin-top:32px;font-size:15px;color:var(--stone);font-weight:300;line-height:1.6;}
/* Toggle button — base styles (desktop: hidden) */
.kit-products-toggle{display:none;align-items:center;justify-content:space-between;width:100%;background:none;border:1px solid var(--lineb);color:var(--stone);font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:600;padding:12px 16px;cursor:pointer;font-family:'Barlow Condensed',sans-serif;transition:border-color .2s,color .2s;margin-bottom:0;}
.kit-products-toggle:hover{border-color:var(--blue);color:var(--bone);}
.kit-products-toggle-arrow{font-size:16px;transition:transform .25s;display:inline-block;}
.kit-card.products-open .kit-products-toggle-arrow{transform:rotate(180deg);}
/* Mobile divider — hidden by default, shown only when products are open */
.kit-divider-mobile{display:none;}
.kit-card.products-open .kit-divider-mobile{display:block;width:100%;height:1px;background:var(--line);margin:16px 0;}
/* ── Mobile ─────────────────────────────────────── */
@media(max-width:768px){
  .kits-section{padding:48px 0 60px;}
  .kits-header{padding:0 24px;margin-bottom:40px;}
  .kits-grid{display:flex;flex-direction:column;gap:1px;}
  .kit-card:nth-child(1){order:2;}
  .kit-card:nth-child(2){order:1;}
  .kit-card:nth-child(3){display:none;}
  .kit-card.featured{margin:0;}
  .kit-card{padding:28px 24px;}
  .kit-products-toggle{display:flex;}
  .kit-products{display:none;}
  .kit-card.products-open .kit-products{display:flex;}
  .kit-divider{display:none;}
  .kit-cta{margin-top:20px;}
}
`;

export default function KitComparison() {
  const navigate = useNavigate();
  const [openKits, setOpenKits] = useState(new Set());
  const toggle = (id) => setOpenKits(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <>
      <style>{CSS}</style>
      <section className="kits-section" id="kits">
        <div className="kits-inner">
          <div className="kits-header reveal">
            <div className="k-sec-tag">Two ways to begin.</div>
            <h2>Choose<br />Your Kit.</h2>
            <p>Each kit arrives once. After that, we only send what you've run out of.</p>
          </div>
          <div className="kits-grid reveal">
            {KITS.map(kit => {
              const products = PRODUCTS.filter(p => kit.productNums.includes(p.num));
              const isSovereign = kit.id === 'sovereign';
              return (
                <div key={kit.id} className={`kit-card${kit.popular ? ' featured' : ''}${kit.comingSoon ? ' coming' : ''}${openKits.has(kit.id) ? ' products-open' : ''}`}>
                  {kit.image
                    ? <img className="kit-image" src={kit.image} alt={`${kit.name} kit`} loading="lazy" />
                    : <div className="kit-image-ph">{kit.name} kit photo<br />coming soon</div>}
                  {kit.popular    && <span className="kit-badge popular">Most Popular</span>}
                  {kit.comingSoon && <span className="kit-badge soon">Coming Soon</span>}
                  <div className="kit-name">{kit.name}</div>
                  <div className="kit-tagline">{kit.tagline}</div>
                  <div className="kit-prices">
                    <div className="kit-price-first">
                      <span className="kit-price-first-amount">£{kit.firstBoxPrice}</span>
                      <span className="kit-price-first-label">first box</span>
                    </div>
                  </div>
                  <div className="kit-divider" />
                  <button className="kit-products-toggle" onClick={() => toggle(kit.id)}>
                    {openKits.has(kit.id) ? 'Hide products' : `${products.filter(p => !p.comingSoon).length} products included`}
                    <span className="kit-products-toggle-arrow">↓</span>
                  </button>
                  <div className="kit-divider-mobile" />
                  <div className="kit-products">
                    {products.map(p => (
                      <div key={p.num} className={`kit-product${p.comingSoon ? ' kit-product-coming' : ''}`}>
                        {p.media?.still
                          ? (
                            <div className={`kit-product-thumb-wrap${isSovereign ? ' flip-left' : ''}`}>
                              <img src={p.media.still} alt={p.name} className="kit-product-thumb" loading="lazy" />
                              <img src={p.media.still} alt="" aria-hidden="true" className="kit-product-preview" loading="lazy" />
                            </div>
                          )
                          : <div className="kit-product-thumb-placeholder" />
                        }
                        <span className="kit-product-num">{p.num}</span>
                        <span>{p.name}{p.comingSoon ? ' *' : ''}</span>
                      </div>
                    ))}
                    {isSovereign && (
                      <div className="kit-product-replacement">
                        * Turkish Kese Mitt replaces Italy Towel Mitt · Beidi Black Soap. Both coming soon.
                      </div>
                    )}
                  </div>
                  {kit.comingSoon ? (
                    <span className="kit-cta inactive">Coming Soon</span>
                  ) : (
                    <button
                      className="kit-cta active"
                      onClick={() => {
                        capture('kit_cta_clicked', { kit: kit.id, kit_name: kit.name });
                        navigate(`/buy?kit=${kit.id}`);
                      }}
                    >
                      Get {kit.name}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="kits-footnote">Subscription coming soon.</p>
        </div>
      </section>
    </>
  );
}
