import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KITS, kitWorth } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';
import { capture } from '../lib/analytics.js';
import { trackAddToCart } from '../lib/addToCartTracker.js';
import { offerActive } from '../lib/offer.js';
import { markOfferReached } from '../lib/qualifiedVisitTracker.js';

const CSS = `
.kits-section{background:linear-gradient(180deg,#090b0f,var(--black));padding:110px 48px;border-top:1px solid var(--line);}
.kits-inner{max-width:1240px;margin:0 auto;}
.kits-header{margin:0 auto 34px;display:grid;grid-template-columns:1fr;gap:18px;max-width:980px;border-top:1px solid rgba(240,236,226,.14);padding-top:26px;}
.kits-header .k-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:14px;}
.kits-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(42px,5.8vw,86px);letter-spacing:.055em;color:var(--bone);line-height:.92;margin:0;}
.kits-header p{font-size:18px;color:rgba(240,236,226,.72);font-weight:300;line-height:1.7;max-width:520px;margin:0;}
.kit-editorial-note{font-size:13px;letter-spacing:2.8px;text-transform:uppercase;color:rgba(240,236,226,.48);font-weight:700;align-self:end;}
.kits-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;max-width:980px;margin:0 auto;}
.kit-card{background:linear-gradient(180deg,rgba(24,28,36,.92),rgba(12,14,18,.98));border:1px solid rgba(240,236,226,.09);padding:42px 34px;display:flex;flex-direction:column;position:relative;box-shadow:0 30px 90px rgba(0,0,0,.22);}
.kit-card.featured{background:linear-gradient(180deg,rgba(26,74,120,.18),rgba(12,14,18,.98));border:1px solid rgba(74,143,199,.55);outline:1px solid rgba(74,143,199,0.18);margin:0;}
/* kit gallery — full-bleed header per card; images shown uncropped (contain) on black */
.kit-gallery{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;width:calc(100% + 64px);margin:-40px -32px 0;background:var(--black);border-bottom:1px solid var(--line);}
.kit-gallery::-webkit-scrollbar{display:none;}
.kit-slide{flex:0 0 100%;scroll-snap-align:center;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;background:var(--black);position:relative;overflow:hidden;}
.kit-slide img{width:100%;height:100%;object-fit:contain;display:block;}
.kit-slide::after{content:'';position:absolute;left:0;right:0;bottom:0;height:44%;background:linear-gradient(to top,rgba(8,9,11,.88),rgba(8,9,11,0));pointer-events:none;}
.kit-slide-label{position:absolute;left:18px;right:70px;bottom:16px;z-index:1;display:flex;flex-direction:column;gap:4px;color:var(--bone);}
.kit-slide-kind{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);font-weight:700;}
.kit-slide-name{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.07em;line-height:1;color:var(--bone);}
.kit-slide-benefit{font-size:13px;color:rgba(240,236,226,.72);font-weight:300;line-height:1.25;max-width:260px;}
.kit-slide-count{position:absolute;right:18px;bottom:17px;z-index:1;font-size:10px;letter-spacing:2px;color:rgba(240,236,226,.56);font-weight:700;}
.kit-dots{display:flex;justify-content:center;gap:7px;margin:12px 0 22px;}
.kit-dot{width:7px;height:7px;border-radius:50%;border:none;padding:0;background:var(--line);cursor:pointer;transition:background .2s,transform .2s;}
.kit-dot.on{background:var(--blue);transform:scale(1.25);}
@media(max-width:768px){
  .kit-gallery{width:calc(100% + 48px);margin:-28px -24px 0;}
}
.kit-badge{display:inline-block;font-size:10px;letter-spacing:4px;text-transform:uppercase;padding:4px 10px;margin-bottom:16px;font-weight:700;}
.kit-badge.popular{background:rgba(74,143,199,.14);color:var(--blit);border:1px solid rgba(74,143,199,.36);}
.kit-badge.soon{background:var(--char);color:var(--stone);border:1px solid var(--lineb);}
.kit-name{font-family:'Bebas Neue',sans-serif;font-size:54px;letter-spacing:.065em;color:var(--bone);line-height:.96;margin-bottom:12px;}
.kit-card-decision{border-top:1px solid rgba(240,236,226,.12);border-bottom:1px solid rgba(240,236,226,.08);padding:18px 0;margin:0 0 24px;display:grid;gap:13px;}
.kit-decision-role{font-size:10px;letter-spacing:3.4px;text-transform:uppercase;color:var(--blit);font-weight:700;}
.kit-decision-title{font-family:'Bebas Neue',sans-serif;font-size:31px;letter-spacing:.065em;color:var(--bone);line-height:1;}
.kit-decision-summary{font-size:15px;color:rgba(240,236,226,.74);font-weight:300;line-height:1.52;margin:0;}
.kit-decision-change{font-size:13px;color:rgba(240,236,226,.58);font-weight:300;line-height:1.45;margin:0;padding-top:12px;border-top:1px solid rgba(240,236,226,.08);}
.kit-decision-change strong{color:var(--bone);font-weight:600;}
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
.kit-cta.active{background:var(--bone);color:var(--black);box-shadow:0 12px 34px rgba(0,0,0,.22);}
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
  .kits-header{padding:24px 24px 0;margin-bottom:40px;}
  .kits-grid{display:flex;flex-direction:column;gap:12px;padding:0 14px;}
  .kit-card:nth-child(1){order:2;}
  .kit-card:nth-child(2){order:1;}
  .kit-card:nth-child(3){display:none;}
  .kit-card.featured{margin:0;}
  .kit-card{padding:28px 24px;}
  .kit-editorial-note{align-self:start;}
}
@media(min-width:840px){
  .kits-header{grid-template-columns:.9fr 1.1fr;align-items:end;}
  .kit-editorial-note{grid-column:2;}
}
`;

const KIT_DECISIONS = {
  ground: {
    role: 'The essential system',
    title: 'Includes 10-min daily and 22-min weekly deep reset',
    summary: 'Outcome: less odour, smoother skin and a back you can actually reach. Both kits include the 10-min daily ritual and the 22-min weekly deep reset.',
    change: 'GROUND stops before the argan oil finish and clay bowl. You still get the clean foundation and clay reset, but not the fed-skin finish.',
  },
  ritual: {
    role: 'The full ritual',
    title: 'Includes 10-min daily and complete 22-min weekly deep reset',
    summary: 'Outcome: barrier feels fed, comfortable and complete after the weekly oil step, not just cleaner.',
    change: 'RITUAL adds argan oil and the clay bowl. It goes into the clay mix, across the scalp, and onto damp skin after rinsing.',
  },
};

function KitGallery({ name, slides }) {
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
            <div>
              <div className="k-sec-tag">Choose the ritual you want to start with.</div>
              <h2>The Ritual System.</h2>
            </div>
            <p>You're not buying products. You're choosing a complete shower discipline: numbered tools, timed steps, and the exact order printed in the box.</p>
            <div className="kit-editorial-note">First batch · 250 kits · Ground / Ritual</div>
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
                    <KitGallery name={kit.name} slides={kitSlides} />
                  )}
                  {kit.popular    && <span className="kit-badge popular">Most Popular</span>}
                  {kit.comingSoon && <span className="kit-badge soon">Coming Soon</span>}
                  <div className="kit-name">{kit.name}</div>
                  {decision && (
                    <div className="kit-card-decision">
                      <div className="kit-decision-role">{decision.role}</div>
                      <div className="kit-decision-title">{decision.title}</div>
                      <p className="kit-decision-summary">{decision.summary}</p>
                      <p className="kit-decision-change"><strong>{decision.change.split('. ')[0]}.</strong> {decision.change.split('. ').slice(1).join('. ')}</p>
                    </div>
                  )}
                  <div className="kit-prices">
                    <div className="kit-price-first">
                      <span className="kit-price-first-amount">£{kit.firstBoxPrice}</span>
                    </div>
                    {!kit.comingSoon && <div className="kit-worth-line">£{kitWorth(kit)} of product</div>}
                    <div className="kit-value-line">Complete {products.filter(p => !p.comingSoon).length}-piece guided system · your shower essentials last 1 to 6 months</div>
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
