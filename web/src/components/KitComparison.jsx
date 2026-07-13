import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KITS, kitWorth } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';
import { capture } from '../lib/analytics.js';
import { trackAddToCart } from '../lib/addToCartTracker.js';
import { offerActive } from '../lib/offer.js';
import { markOfferReached } from '../lib/qualifiedVisitTracker.js';

const CSS = `
.kits-section{background:var(--black);padding:100px 48px;border-top:1px solid var(--line);}
.kits-inner{max-width:1400px;margin:0 auto;}
.kits-header{margin-bottom:64px;}
.kits-header .k-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.kits-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:16px;}
.kits-header p{font-size:17px;color:var(--mist);font-weight:300;line-height:1.7;max-width:560px;}
.kits-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:var(--line);max-width:860px;margin:0 auto;}
.kit-card{background:var(--char);padding:40px 32px;display:flex;flex-direction:column;position:relative;}
.kit-card.featured{background:var(--mid);border:1px solid var(--blue);outline:1px solid rgba(46,109,164,0.3);margin:-1px;}
/* kit gallery — full-bleed header per card; images shown uncropped (contain) on black */
.kit-gallery{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;width:calc(100% + 64px);margin:-40px -32px 0;background:var(--black);border-bottom:1px solid var(--line);}
.kit-gallery::-webkit-scrollbar{display:none;}
.kit-slide{flex:0 0 100%;scroll-snap-align:center;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;background:var(--black);}
.kit-slide img{width:100%;height:100%;object-fit:contain;display:block;}
.kit-dots{display:flex;justify-content:center;gap:7px;margin:12px 0 22px;}
.kit-dot{width:7px;height:7px;border-radius:50%;border:none;padding:0;background:var(--line);cursor:pointer;transition:background .2s,transform .2s;}
.kit-dot.on{background:var(--blue);transform:scale(1.25);}
@media(max-width:768px){
  .kit-gallery{width:calc(100% + 48px);margin:-28px -24px 0;}
}
.kit-badge{display:inline-block;font-size:10px;letter-spacing:4px;text-transform:uppercase;padding:4px 10px;margin-bottom:16px;font-weight:700;}
.kit-badge.popular{background:var(--blue);color:var(--bone);}
.kit-badge.soon{background:var(--char);color:var(--stone);border:1px solid var(--lineb);}
.kit-name{font-family:'Bebas Neue',sans-serif;font-size:48px;letter-spacing:.06em;color:var(--bone);line-height:1;margin-bottom:10px;}
/* Outcome-led chooser copy: bold declaration of what the kit gets you, then one line
   saying who it's for / what the difference is (replaces the long taglines). */
.kit-outcome{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:19px;letter-spacing:1px;text-transform:uppercase;color:var(--blit);line-height:1.25;margin-bottom:8px;}
.kit-chooser{font-size:15px;color:var(--mist);font-weight:300;line-height:1.55;margin-bottom:24px;}
.kit-prices{margin-bottom:24px;}
.kit-value-line{font-size:14px;color:var(--mist);font-weight:300;margin-top:8px;}
.kit-cert-line{font-size:13px;color:var(--stone);font-weight:500;margin-top:5px;}
.kit-worth-line{font-size:16px;font-weight:600;color:var(--mist);text-decoration:line-through;text-decoration-color:rgba(240,236,226,0.5);margin-top:6px;}
.kit-product-worth{margin-left:auto;font-size:11px;color:var(--stone);white-space:nowrap;}
.kit-products-total{font-size:14px;color:var(--bone);font-weight:600;padding:10px 0 2px;border-top:1px solid var(--line);margin-top:8px;}
.kit-price-first{display:flex;align-items:baseline;gap:8px;margin-bottom:8px;}
.kit-price-first-amount{font-family:'Bebas Neue',sans-serif;font-size:52px;color:var(--bone);letter-spacing:-1px;line-height:1;}
.kit-price-first-label{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
.kit-price-sub{font-size:15px;color:var(--mist);font-weight:300;}
.kit-price-sub span{color:var(--blit);font-weight:500;}
.kit-price-delivery{display:inline-flex;align-items:center;gap:7px;margin-top:12px;padding:6px 11px;border:1px solid rgba(46,109,164,0.55);background:rgba(46,109,164,0.12);border-radius:2px;font-size:13px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:var(--bone);}
.kit-price-delivery s{color:var(--stone);font-weight:400;}
.kit-price-delivery .free{color:#4A8FC7;font-weight:700;letter-spacing:1px;}
.kit-products{display:none;flex-direction:column;gap:8px;margin-bottom:24px;}
.kit-card.products-open .kit-products{display:flex;}
.kit-product{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--mist);font-weight:300;}
.kit-product-num{font-size:10px;letter-spacing:2px;color:var(--blue);font-weight:600;min-width:20px;}
.kit-product-name-wrap{display:flex;flex-direction:column;gap:2px;min-width:0;}
.kit-product-outcome{font-size:13px;color:var(--stone);font-weight:300;line-height:1.3;}
.kit-product-thumb-wrap{position:relative;flex-shrink:0;}
.kit-product-thumb{width:40px;height:52px;object-fit:cover;object-position:center;background:var(--dark);border:1px solid var(--line);flex-shrink:0;display:block;}
.kit-product-thumb-placeholder{width:40px;height:52px;background:var(--dark);border:1px solid var(--line);flex-shrink:0;}
.kit-product-preview{position:absolute;bottom:calc(100% + 12px);left:0;width:220px;height:275px;object-fit:cover;object-position:center;background:var(--dark);border:1px solid var(--line);box-shadow:0 12px 32px rgba(0,0,0,0.6);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s ease;z-index:50;}
.kit-product-thumb-wrap.flip-left .kit-product-preview{left:auto;right:0;}
.kit-product-thumb-wrap:hover .kit-product-preview{opacity:1;visibility:visible;}
/* tiny magnifier on the small kit thumbs — signals they enlarge on hover/tap */
.kit-zoom-dot{position:absolute;bottom:2px;right:2px;width:15px;height:15px;border-radius:50%;background:rgba(8,9,11,0.72);border:1px solid rgba(240,236,226,0.4);display:flex;align-items:center;justify-content:center;color:var(--bone);pointer-events:none;transition:opacity .15s;}
.kit-product-thumb-wrap:hover .kit-zoom-dot{opacity:0;}
.kit-product-coming{opacity:0.55;}
.kit-product-replacement{font-size:12px;color:var(--stone);font-style:italic;margin-top:4px;padding-left:32px;}
/* margin-top:auto bottom-aligns the CTAs across cards of unequal content height
   (GROUND has no badge/dots); the toggle's margin-bottom guarantees a minimum gap. */
.kit-cta{display:block;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.12em;text-align:center;padding:16px 24px;transition:background .2s,transform .15s;margin-top:auto;border:none;cursor:pointer;width:100%;}
.kit-cta.active{background:var(--bone);color:var(--black);}
.kit-cta.active:hover{background:#fff;transform:translateY(-1px);}
.kit-cta.inactive{background:var(--char);color:var(--stone);border:1px solid var(--lineb);cursor:default;}
.kits-footnote{text-align:center;margin-top:32px;font-size:15px;color:var(--stone);font-weight:300;line-height:1.6;}
.kits-footnote strong{color:var(--bone);font-weight:600;}
.kits-trust-row{margin-top:10px;font-size:13px;color:var(--stone);font-weight:300;letter-spacing:.3px;}
/* Contents live behind the toggle at ALL widths — the value line + count carry the
   system story; the full list is one tap away (was desktop-always-open pre 2026-07-08). */
.kit-products-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;background:none;border:1px solid var(--lineb);color:var(--stone);font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:600;padding:12px 16px;cursor:pointer;font-family:'Barlow Condensed',sans-serif;transition:border-color .2s,color .2s;margin-bottom:20px;}
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
}
`;

function KitGallery({ name, images }) {
  const ref = useRef(null);
  const [active, setActive] = useState(0);
  const onScroll = () => {
    const el = ref.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };
  const goTo = (i) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };
  return (
    <>
      <div className="kit-gallery" ref={ref} onScroll={onScroll}>
        {images.map((src, i) => (
          <div className="kit-slide" key={src}>
            <img src={src} alt={`${name} kit — view ${i + 1}`} loading="lazy" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="kit-dots">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              className={`kit-dot${i === active ? ' on' : ''}`}
              aria-label={`View ${name} photo ${i + 1}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function KitComparison() {
  const navigate = useNavigate();
  const [openKits, setOpenKits] = useState(new Set());
  const toggle = (id) => setOpenKits(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Reaching the offer is an intent-anchored QualifiedVisit signal.
  useEffect(() => {
    const el = document.getElementById('kits');
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { markOfferReached(); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <section className="kits-section" id="kits">
        <div className="kits-inner">
          <div className="kits-header reveal">
            <div className="k-sec-tag">Two ways to begin.</div>
            <h2>Choose<br />Your Kit.</h2>
            <p>You're not buying products. You're following a system. Every product numbered, every step timed, the exact routine in the box.</p>
          </div>
          <div className="kits-grid reveal">
            {KITS.filter(k => !k.hidden).map(kit => {
              const products = PRODUCTS.filter(p => kit.productNums.includes(p.num));
              const isSovereign = kit.id === 'sovereign';
              return (
                <div key={kit.id} className={`kit-card${kit.popular ? ' featured' : ''}${kit.comingSoon ? ' coming' : ''}${openKits.has(kit.id) ? ' products-open' : ''}`}>
                  {(kit.gallery?.length || kit.image) && (
                    <KitGallery name={kit.name} images={kit.gallery?.length ? kit.gallery : [kit.image]} />
                  )}
                  {kit.popular    && <span className="kit-badge popular">Most Popular</span>}
                  {kit.comingSoon && <span className="kit-badge soon">Coming Soon</span>}
                  <div className="kit-name">{kit.name}</div>
                  <div className="kit-outcome">{kit.outcome}</div>
                  <div className="kit-chooser">{kit.chooser}</div>
                  <div className="kit-prices">
                    <div className="kit-price-first">
                      <span className="kit-price-first-amount">£{kit.firstBoxPrice}</span>
                    </div>
                    {!kit.comingSoon && <div className="kit-worth-line">£{kitWorth(kit)} of product</div>}
                    <div className="kit-value-line">Complete {products.filter(p => !p.comingSoon).length}-piece guided system · your shower essentials last 6 to 12 months</div>
                    {!kit.comingSoon && (
                      <div className="kit-cert-line">
                        {kit.id === 'ritual'
                          ? '100% certified organic argan oil · 100% natural Atlas clay'
                          : '100% natural Atlas clay · sulphate-free wash'}
                      </div>
                    )}
                    {offerActive() && !kit.comingSoon && (
                      <div className="kit-price-delivery">
                        Delivery <s>£5.95</s> <span className="free">FREE</span>
                      </div>
                    )}
                  </div>
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
                              <span className="kit-zoom-dot" aria-hidden="true">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
                              </span>
                            </div>
                          )
                          : <div className="kit-product-thumb-placeholder" />
                        }
                        <span className="kit-product-num">{p.num}</span>
                        <span className="kit-product-name-wrap">
                          <span>{p.name}{p.comingSoon ? ' *' : ''}</span>
                          {p.outcome?.tileAfter && <span className="kit-product-outcome">{p.outcome.tileAfter}</span>}
                        </span>
                        {p.value > 0 && <span className="kit-product-worth">worth £{p.value}</span>}
                      </div>
                    ))}
                    {!kit.comingSoon && (
                      <div className="kit-products-total">
                        £{kitWorth(kit)} of product · only available as the kit, £{kit.firstBoxPrice}
                      </div>
                    )}
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
                      data-buy-cta={`/buy?kit=${kit.id}`}
                      onClick={() => {
                        capture('kit_cta_clicked', { kit: kit.id, kit_name: kit.name });
                        trackAddToCart(kit.id);
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
          <div className="kits-footnote reveal">
            <strong>First batch · only 250 kits made.</strong> Next batch £75 and £95.
            <div className="kits-trust-row">🚚 Free UK delivery · ✓ 14-day returns · 🔒 Secured by Stripe</div>
          </div>
        </div>
      </section>
    </>
  );
}
