import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KITS, kitWorth } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';
import { capture } from '../lib/analytics.js';
import { trackAddToCart } from '../lib/addToCartTracker.js';
import { markOfferReached } from '../lib/qualifiedVisitTracker.js';

const CSS = `
.kits-section{background:linear-gradient(180deg,#090b0f,var(--black));padding:clamp(48px,5vw,64px) 48px;border-top:1px solid var(--line);min-height:calc(100svh - 62px);display:flex;align-items:center;}
.kits-inner{width:100%;max-width:1240px;margin:0 auto;}
.kits-header{margin:0 auto 20px;max-width:920px;border-top:1px solid rgba(240,236,226,.14);padding-top:20px;}
.kits-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4.2vw,52px);letter-spacing:.055em;color:var(--bone);line-height:.92;margin:0;}
.kits-header p{font-size:17px;color:rgba(240,236,226,.72);font-weight:300;line-height:1.55;max-width:500px;margin:12px 0 0;}
.kits-grid{display:grid;grid-template-columns:minmax(0,.86fr) minmax(0,1.14fr);gap:18px;max-width:1040px;margin:0 auto;align-items:start;}
.kit-card{background:linear-gradient(180deg,rgba(18,21,28,.92),rgba(8,9,11,.98));border:1px solid rgba(240,236,226,.11);padding:42px 34px;display:flex;flex-direction:column;position:relative;box-shadow:0 18px 54px rgba(0,0,0,.18);}
.kit-card:not(.featured){opacity:1;filter:none;}
.kit-card.featured{transform:none;background:linear-gradient(180deg,rgba(18,32,49,.72),rgba(8,9,11,.99));border:1px solid rgba(240,236,226,.24);outline:1px solid rgba(74,143,199,0.22);margin:0;box-shadow:0 42px 120px rgba(0,0,0,.36);}
/* Full-bleed header per card. Portrait kit photography is deliberately enlarged and cropped
   inside the shallow desktop frame, so the actual products remain legible. */
.kit-gallery{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;width:calc(100% + 64px);margin:-40px -32px 0;background:radial-gradient(circle at 50% 36%,rgba(74,143,199,.14),rgba(8,9,11,.92) 42%,var(--black));border-bottom:1px solid var(--line);}
.kit-gallery::-webkit-scrollbar{display:none;}
.kit-slide{flex:0 0 100%;scroll-snap-align:center;height:185px;display:flex;align-items:center;justify-content:center;background:var(--black);position:relative;overflow:hidden;}
.kit-slide img{width:auto;height:330px;max-width:none;object-fit:contain;display:block;filter:brightness(1.18) contrast(1.04);}
.kit-slide::after{content:'';position:absolute;left:0;right:0;bottom:0;height:44%;background:linear-gradient(to top,rgba(8,9,11,.88),rgba(8,9,11,0));pointer-events:none;}
.kit-comparison-overlay{position:absolute;top:14px;left:14px;z-index:2;display:grid;gap:3px;padding:9px 10px;border:1px solid rgba(240,236,226,.24);background:rgba(8,9,11,.8);pointer-events:none;}
.kit-comparison-count{font-size:11px;letter-spacing:2.4px;text-transform:uppercase;color:var(--bone);font-weight:700;}
.kit-comparison-detail{font-size:12px;color:rgba(240,236,226,.74);font-weight:500;line-height:1.15;}
.kit-card.featured .kit-comparison-overlay{border-color:rgba(74,143,199,.62);background:rgba(16,34,51,.86);}
.kit-slide-label{position:absolute;left:18px;right:70px;bottom:16px;z-index:1;display:flex;flex-direction:column;gap:4px;color:var(--bone);}
.kit-slide-kind{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);font-weight:700;}
.kit-slide-name{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.07em;line-height:1;color:var(--bone);}
.kit-slide-benefit{font-size:13px;color:rgba(240,236,226,.72);font-weight:300;line-height:1.25;max-width:260px;}
.kit-slide-count{position:absolute;right:18px;bottom:17px;z-index:1;font-size:10px;letter-spacing:2px;color:rgba(240,236,226,.56);font-weight:700;}
.kit-dots{display:flex;justify-content:center;gap:7px;margin:8px 0 12px;}
.kit-dot{width:7px;height:7px;border-radius:50%;border:none;padding:0;background:var(--line);cursor:pointer;transition:background .2s,transform .2s;}
.kit-dot.on{background:var(--blue);transform:scale(1.25);}
@media(max-width:768px){
  .kit-gallery{width:calc(100% + 48px);margin:-28px -24px 0;}
  .kit-slide{height:auto;aspect-ratio:4/3;}
  .kit-slide img{width:100%;height:100%;max-width:100%;object-fit:contain;}
}
.kit-badge{display:inline-block;font-size:10px;letter-spacing:4px;text-transform:uppercase;padding:4px 10px;margin-bottom:16px;font-weight:700;}
.kit-badge.popular{background:rgba(74,143,199,.14);color:var(--blit);border:1px solid rgba(74,143,199,.36);}
.kit-badge.soon{background:var(--char);color:var(--stone);border:1px solid var(--lineb);}
.kit-name-row{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:10px;}
.kit-name{font-family:'Bebas Neue',sans-serif;font-size:40px;letter-spacing:.065em;color:var(--bone);line-height:.96;}
.kit-card-price{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:.035em;color:var(--bone);line-height:1;white-space:nowrap;}
.kit-card-decision{margin:0 0 14px;}
.kit-decision-title{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.065em;color:var(--bone);line-height:1;}
.kit-card-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(126px,.72fr);gap:10px;align-items:stretch;}
.kit-product-worth{margin-left:auto;font-size:11px;color:var(--stone);white-space:nowrap;}
.kit-products-total{font-size:14px;color:var(--bone);font-weight:600;padding:10px 0 2px;border-top:1px solid var(--line);margin-top:8px;}
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
.kit-cta{display:block;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;text-align:center;padding:14px 12px;transition:background .2s,transform .15s;margin:0;border:none;cursor:pointer;width:100%;}
.kit-cta.active{background:var(--bone);color:var(--black);box-shadow:0 12px 34px rgba(0,0,0,.22);}
.kit-cta.active:hover{background:#fff;transform:translateY(-1px);}
.kit-cta.inactive{background:var(--char);color:var(--stone);border:1px solid var(--lineb);cursor:default;}
/* Contents live behind the toggle at ALL widths — the value line + count carry the
   system story; the full list is one tap away (was desktop-always-open pre 2026-07-08). */
.kit-products-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;background:rgba(46,109,164,.16);border:1px solid rgba(74,143,199,.58);color:var(--bone);font-size:13px;letter-spacing:2.1px;text-transform:uppercase;font-weight:700;padding:14px 16px;cursor:pointer;font-family:'Barlow Condensed',sans-serif;transition:background .2s,border-color .2s,color .2s;margin:0;}
.kit-products-toggle:hover{background:rgba(46,109,164,.28);border-color:var(--blit);}
.kit-products-toggle-arrow{font-size:16px;transition:transform .25s;display:inline-block;}
.kit-card.products-open .kit-products-toggle-arrow{transform:rotate(180deg);}
/* Mobile divider — hidden by default, shown only when products are open */
.kit-divider-mobile{display:none;}
.kit-card.products-open .kit-divider-mobile{display:block;width:100%;height:1px;background:var(--line);margin:16px 0;}
/* ── Mobile ─────────────────────────────────────── */
@media(max-width:768px){
  .kits-section{padding:48px 0 60px;}
  .kits-header{padding:24px 24px 0;margin-bottom:24px;}
  .kits-grid{display:flex;flex-direction:column;gap:12px;padding:0 14px;}
  .kit-card:nth-child(1){order:2;}
  .kit-card:nth-child(2){order:1;}
  .kit-card:nth-child(3){display:none;}
  .kit-card.featured{margin:0;}
  .kit-card.featured{transform:none;}
  .kit-card:not(.featured){opacity:1;filter:none;}
  .kit-card{padding:28px 24px;}
  .kit-card-actions{grid-template-columns:1fr;}
}
@media(min-width:769px){
  .kit-card.featured .kit-badge{display:none;}
}
`;

const KIT_DECISIONS = {
  ground: {
    title: 'Properly clean.',
  },
  ritual: {
    title: 'Properly clean. Skin properly fed.',
  },
};

const KIT_IMAGE_COMPARISONS = {
  ground: {
    count: '7-PIECE KIT',
    detail: 'The complete clean',
  },
  ritual: {
    count: '9-PIECE KIT',
    detail: 'Adds body oil + clay bowl',
  },
};

function KitGallery({ name, slides, comparison }) {
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
        {slides.map((slide, i) => (
          <div className="kit-slide" key={`${slide.label}-${slide.src}`}>
            <img src={slide.src} alt={slide.alt} loading="lazy" />
            {i === 0 && comparison && (
              <div className="kit-comparison-overlay">
                <span className="kit-comparison-count">{comparison.count}</span>
                <span className="kit-comparison-detail">{comparison.detail}</span>
              </div>
            )}
            <div className="kit-slide-label">
              <span className="kit-slide-kind">{slide.kind}</span>
              <span className="kit-slide-name">{slide.label}</span>
              {slide.benefit && <span className="kit-slide-benefit">{slide.benefit}</span>}
            </div>
            <div className="kit-slide-count">{i + 1}/{slides.length}</div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="kit-dots">
          {slides.map((slide, i) => (
            <button
              key={`${slide.label}-${slide.src}`}
              type="button"
              className={`kit-dot${i === active ? ' on' : ''}`}
              aria-label={`View ${name} photo ${i + 1}: ${slide.label}`}
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
            <h2>GROUND or RITUAL.</h2>
            <p>Both give you a complete body clean. RITUAL adds body oil for the weekly finish.</p>
          </div>
          <div className="kits-grid reveal">
            {KITS.filter(k => !k.hidden).map(kit => {
              const products = PRODUCTS.filter(p => kit.productNums.includes(p.num));
              const isSovereign = kit.id === 'sovereign';
              const decision = KIT_DECISIONS[kit.id];
              const productSlides = products.filter(p => !p.comingSoon && p.media?.still).map((p) => ({
                src: p.media.still,
                kind: 'Included product',
                label: `${p.num} · ${p.name}`,
                benefit: p.outcome?.tileAfter,
                alt: `${p.num} ${p.name} included in the ${kit.name} kit`,
              }));
              const kitSlides = [
                ...(kit.gallery?.length ? kit.gallery : [kit.image]).filter(Boolean).map((src, i) => ({
                  src,
                  kind: 'Full kit view',
                  label: i === 0 ? `${kit.name} kit` : `${kit.name} detail`,
                  alt: `${kit.name} kit view ${i + 1}`,
                })),
                ...productSlides,
              ];
              return (
                <div key={kit.id} className={`kit-card${kit.popular ? ' featured' : ''}${kit.comingSoon ? ' coming' : ''}${openKits.has(kit.id) ? ' products-open' : ''}`}>
                  {kitSlides.length > 0 && (
                    <KitGallery name={kit.name} slides={kitSlides} comparison={KIT_IMAGE_COMPARISONS[kit.id]} />
                  )}
                  {kit.popular    && <span className="kit-badge popular">Most Popular</span>}
                  {kit.comingSoon && <span className="kit-badge soon">Coming Soon</span>}
                  <div className="kit-name-row">
                    <div className="kit-name">{kit.name}</div>
                    <span className="kit-card-price">£{kit.firstBoxPrice}</span>
                  </div>
                  {decision && (
                    <div className="kit-card-decision">
                      <div className="kit-decision-title">{decision.title}</div>
                    </div>
                  )}
                  <div className="kit-card-actions">
                    <button className="kit-products-toggle" onClick={() => toggle(kit.id)}>
                      {openKits.has(kit.id) ? 'Hide products' : `See all ${products.filter(p => !p.comingSoon).length} products`}
                      <span className="kit-products-toggle-arrow">↓</span>
                    </button>
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
                        Buy {kit.name} · £{kit.firstBoxPrice}
                      </button>
                    )}
                  </div>
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
                        * Turkish Kese Mitt replaces Italy Towel Mitt · Beidi Black Cleanse. Both coming soon.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
