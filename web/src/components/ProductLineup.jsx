import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRODUCTS } from '../data/products.js';
import { capture } from '../lib/analytics.js';

const CSS = `
/* ── Section ───────────────────────────────────── */
.products-section{background:var(--black);padding:80px 0;border-top:1px solid var(--line);}
.products-header{max-width:1400px;margin:0 auto 48px;padding:0 48px;display:flex;align-items:flex-end;justify-content:space-between;gap:40px;flex-wrap:wrap;}
.p-sec-left{}
.p-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:12px;}
.p-sec-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(40px,5vw,72px);letter-spacing:.04em;color:var(--bone);line-height:.92;margin:0;}
.p-sec-sub{font-size:15px;color:var(--stone);font-weight:300;line-height:1.65;max-width:300px;text-align:right;}

/* ── Grid ──────────────────────────────────────── */
.products-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);max-width:1400px;margin:0 auto;}

/* ── Card ──────────────────────────────────────── */
.product-card{background:#09090c;display:flex;flex-direction:column;overflow:hidden;position:relative;text-decoration:none;color:inherit;}
.product-card:hover .prod-img-wrap img{transform:scale(1.04);}
/* face/model shot leads; hover reveals the product-only studio still over it */
.prod-img-base{object-position:center top;}
.prod-img-hover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;opacity:0;transition:opacity .45s ease, transform .5s ease;z-index:1;}
.product-card:hover .prod-img-hover{opacity:1;}

/* Image */
.prod-img-wrap{position:relative;width:100%;aspect-ratio:3/4;overflow:hidden;background:#0d0e12;flex-shrink:0;}
.prod-img-wrap img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;transition:transform .5s ease;}
.prod-img-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}
.prod-img-placeholder svg{width:55%;height:55%;opacity:.45;}

/* Badges */
.prod-badge-num{position:absolute;top:12px;left:12px;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;background:rgba(8,9,11,0.82);color:var(--bone);padding:3px 9px;z-index:2;backdrop-filter:blur(6px);}
.prod-badge-freq{position:absolute;top:12px;right:12px;font-size:9px;letter-spacing:3px;text-transform:uppercase;font-weight:700;padding:4px 8px;z-index:2;}
.prod-badge-freq.daily{background:var(--blue);color:var(--bone);}
.prod-badge-freq.weekly{background:#c8a96e;color:#08090b;}
.prod-badge-freq.soon{background:rgba(240,236,226,0.08);color:var(--stone);border:1px solid var(--lineb);}

/* Info — card shows name, tagline, view affordance only */
.prod-info{padding:16px 18px 18px;display:flex;flex-direction:column;gap:4px;flex:1;}
.prod-name{font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:var(--bone);font-weight:700;line-height:1.3;}
.prod-tagline{font-size:13px;font-weight:600;color:var(--bone);line-height:1.4;margin-top:8px;}

/* View details affordance — pinned to bottom of card */
.prod-view-details{
  display:flex;align-items:center;justify-content:center;gap:6px;
  margin-top:auto;
  padding:10px 0;
  padding-top:16px;
  background:rgba(46,109,164,0.1);
  border:1px solid rgba(46,109,164,0.3);
  border-radius:4px;
  font-family:'Barlow Condensed',sans-serif;
  font-size:11px;letter-spacing:2.5px;text-transform:uppercase;
  color:var(--blit);font-weight:600;
  width:100%;
  transition:background .2s,border-color .2s,color .2s;
}
.product-card:hover .prod-view-details{background:rgba(46,109,164,0.2);border-color:rgba(46,109,164,0.6);color:var(--bone);}

/* ── See all ────────────────────────────────────── */
.products-see-all{display:none;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:1px;padding:18px 24px;background:var(--char);border:none;font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;cursor:pointer;transition:color .2s,background .2s;}
.products-see-all:hover{background:var(--mid);color:var(--bone);}
.products-see-all-arrow{font-size:16px;}
/* magnifier badge — signals the tile opens the product (hover on desktop, always on mobile) */
.prod-zoom-badge{position:absolute;bottom:10px;right:10px;z-index:2;width:30px;height:30px;border-radius:50%;background:rgba(8,9,11,0.55);backdrop-filter:blur(4px);border:1px solid rgba(240,236,226,0.35);display:flex;align-items:center;justify-content:center;color:var(--bone);opacity:0;transition:opacity .25s,background .2s,border-color .2s;}
.product-card:hover .prod-zoom-badge{opacity:1;background:var(--blue);border-color:var(--blue);}

/* ── Responsive grid ────────────────────────────── */
@media(max-width:960px){
  .products-grid{grid-template-columns:repeat(3,1fr);}
}
@media(max-width:640px){
  .products-grid{grid-template-columns:repeat(2,1fr);}
  .products-section{padding:60px 0;}
  .products-header{padding:0 24px;gap:16px;}
  .p-sec-sub{text-align:left;max-width:none;}
  .prod-info{padding:12px 12px 14px;}
  /* show every product on mobile (no "see all" gate) + make the view affordance pop + always show the badge */
  .prod-view-details{color:var(--bone);background:rgba(46,109,164,0.22);border-color:rgba(46,109,164,0.6);}
  .prod-zoom-badge{opacity:1;}
}
`;

export default function ProductLineup() {
  const [allVisible, setAllVisible] = useState(false);
  const navigate = useNavigate();

  // Only show products that have real imagery (excludes coming-soon Kese / Beidi).
  // When their photos are added to products.js, they reappear automatically.
  const shown = PRODUCTS.filter((p) => p.media?.still);

  return (
    <>
      <style>{CSS}</style>

      <section className="products-section" id="products">
        <div className="products-header reveal">
          <div className="p-sec-left">
            <div className="p-sec-tag">{shown.length} products. One system.</div>
            <h2 className="p-sec-title">The<br />Products.</h2>
          </div>
          <p className="p-sec-sub">
            Each product is numbered and used in sequence. Sourced from the country that does that tradition best.
          </p>
        </div>

        <div className="products-grid reveal">
          {shown.map((p, idx) => {
            const hiddenClass = !allVisible && idx >= 4 ? ' mob-hidden' : '';

            const imgEl = (
              <div className="prod-img-wrap">
                {/* face/model shot leads (connection); hover reveals the product-only still */}
                <img
                  className="prod-img-base"
                  src={p.media?.gallery?.[0] || p.media?.still}
                  alt={p.name}
                  loading="lazy"
                  width="600"
                  height="800"
                />
                {p.media?.gallery?.[0] && p.media?.still && (
                  <img className="prod-img-hover" src={p.media.still} alt="" aria-hidden="true" loading="lazy" width="600" height="800" />
                )}
                <span className="prod-badge-num">{p.num}</span>
                {p.tag?.includes('Daily') && <span className="prod-badge-freq daily">Daily</span>}
                {p.tag?.includes('Weekly') && <span className="prod-badge-freq weekly">Weekly</span>}
                {p.comingSoon && <span className="prod-badge-freq soon">Soon</span>}
                {!p.comingSoon && (
                  <span className="prod-zoom-badge" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
                  </span>
                )}
              </div>
            );

            const infoEl = (
              <div className="prod-info">
                <div className="prod-name">{p.name}</div>
                <div className="prod-tagline">{p.tagline}</div>
                {!p.comingSoon && <span className="prod-view-details">View Product →</span>}
              </div>
            );

            if (p.comingSoon) {
              return (
                <div key={p.num} className={`product-card${hiddenClass}`}>
                  {imgEl}
                  {infoEl}
                </div>
              );
            }

            return (
              <a
                key={p.num}
                className={`product-card${hiddenClass}`}
                href={`/product/${p.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  capture('product_card_clicked', { slug: p.slug });
                  navigate(`/product/${p.slug}`);
                }}
              >
                {imgEl}
                {infoEl}
              </a>
            );
          })}
        </div>

        {!allVisible && (
          <button className="products-see-all" onClick={() => setAllVisible(true)}>
            See all {shown.length} products <span className="products-see-all-arrow">↓</span>
          </button>
        )}
      </section>
    </>
  );
}
