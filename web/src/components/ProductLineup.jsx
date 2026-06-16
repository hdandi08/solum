import { useState } from 'react';
import { PRODUCTS } from '../data/products.js';

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
.product-card{background:#09090c;display:flex;flex-direction:column;overflow:hidden;position:relative;}
.product-card:hover .prod-img-wrap img{transform:scale(1.04);}

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

/* Info — card shows name, meta, tagline, button only */
.prod-info{padding:16px 18px 18px;display:flex;flex-direction:column;gap:4px;flex:1;}
.prod-name{font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:var(--bone);font-weight:700;line-height:1.3;}
.prod-meta{display:flex;align-items:center;gap:8px;margin-top:2px;flex-wrap:wrap;}
.prod-origin{font-size:11px;color:var(--stone);font-weight:300;letter-spacing:.3px;}
.prod-size{font-size:10px;letter-spacing:1.5px;color:var(--blit);font-weight:600;background:rgba(46,109,164,0.12);border:1px solid rgba(46,109,164,0.25);padding:2px 7px;border-radius:3px;}
.prod-tagline{font-size:13px;font-weight:600;color:var(--bone);line-height:1.4;margin-top:8px;}
.prod-highlights{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;}
.prod-highlight{font-size:9px;letter-spacing:1px;text-transform:uppercase;font-weight:700;padding:3px 7px;border-radius:3px;border:1px solid;}
.prod-highlight.daily{color:#7ab8e8;background:rgba(46,109,164,0.15);border-color:rgba(46,109,164,0.5);}
.prod-highlight.weekly{color:#d4a847;background:rgba(200,169,110,0.15);border-color:rgba(200,169,110,0.5);}
.prod-highlight.neutral{color:rgba(240,236,226,0.7);background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.15);}
.prod-lifespan{font-size:10px;color:var(--stone);font-weight:400;margin-top:6px;letter-spacing:.2px;}

/* View details button — pinned to bottom of card */
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
  cursor:pointer;width:100%;
  transition:background .2s,border-color .2s,color .2s;
}
.prod-view-details:hover{background:rgba(46,109,164,0.2);border-color:rgba(46,109,164,0.6);color:var(--bone);}

/* ── See all ────────────────────────────────────── */
.products-see-all{display:none;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:1px;padding:18px 24px;background:var(--char);border:none;font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;cursor:pointer;transition:color .2s,background .2s;}
.products-see-all:hover{background:var(--mid);color:var(--bone);}
.products-see-all-arrow{font-size:16px;}

/* ── Backdrop ───────────────────────────────────── */
.pd-backdrop{
  position:fixed;inset:0;z-index:8000;
  background:rgba(0,0,0,0);
  pointer-events:none;
  transition:background .3s;
}
.pd-backdrop.open{
  background:rgba(0,0,0,0.75);
  pointer-events:all;
}

/* ── Modal — desktop default ────────────────────── */
.pd-drawer{
  position:fixed;z-index:8001;
  background:#0d0e12;border:1px solid #1e2530;
  border-radius:16px;
  overflow-y:auto;
  transition:opacity .25s ease, transform .25s ease;
  opacity:0;pointer-events:none;
  /* desktop: centered */
  top:50%;left:50%;
  transform:translate(-50%,-46%);
  width:min(640px,92vw);
  max-height:85vh;
  box-shadow:0 24px 80px rgba(0,0,0,0.7);
}
.pd-drawer.open{opacity:1;pointer-events:all;transform:translate(-50%,-50%);}

.pd-drawer-handle{display:none;}

/* ── Drawer — mobile override ───────────────────── */
@media(max-width:640px){
  .pd-drawer{
    top:auto;left:0;right:0;bottom:0;
    width:100%;max-width:100%;
    transform:translateY(100%);
    border-radius:20px 20px 0 0;
    border:none;border-top:1px solid #1e2530;
  }
  .pd-drawer.open{transform:translateY(0);opacity:1;}
  .pd-drawer-handle{display:block;width:36px;height:4px;background:#2e2e38;border-radius:2px;margin:14px auto 0;}
}

/* ── Drawer internals ───────────────────────────── */
.pd-drawer-header{display:flex;align-items:flex-start;gap:16px;padding:24px 24px 0;}
.pd-drawer-img{width:80px;height:107px;object-fit:cover;object-position:center;border-radius:6px;flex-shrink:0;background:#181c24;}
.pd-drawer-img-placeholder{width:80px;height:107px;border-radius:6px;background:#181c24;border:1px solid #1e2530;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.pd-drawer-title-block{flex:1;padding-top:2px;}
.pd-drawer-num{font-family:'Bebas Neue',sans-serif;font-size:12px;letter-spacing:.2em;color:var(--blit);margin-bottom:5px;}
.pd-drawer-name{font-size:16px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:700;line-height:1.2;}
.pd-drawer-origin{font-size:13px;color:var(--stone);font-weight:300;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.pd-drawer-freq{display:inline-block;margin-top:10px;font-size:9px;letter-spacing:3px;text-transform:uppercase;font-weight:700;padding:3px 8px;}
.pd-drawer-freq.daily{background:var(--blue);color:var(--bone);}
.pd-drawer-freq.weekly{background:#c8a96e;color:#08090b;}
.pd-drawer-freq.soon{background:rgba(240,236,226,0.08);color:var(--stone);border:1px solid var(--lineb);}
.pd-drawer-close{width:36px;height:36px;border-radius:50%;background:#1e2530;border:none;color:var(--stone);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:auto;transition:background .2s,color .2s;}
.pd-drawer-close:hover{background:#2e3340;color:var(--bone);}

.pd-drawer-tagline{font-size:18px;font-weight:700;color:var(--bone);line-height:1.35;padding:20px 24px 0;}
.pd-drawer-desc{font-size:15px;color:var(--mist);line-height:1.7;padding:12px 24px 0;font-weight:400;}
.pd-drawer-benefits{list-style:none;padding:16px 24px 32px;display:flex;flex-direction:column;gap:12px;margin:0;}
.pd-drawer-benefit{font-size:14px;color:rgba(240,236,226,0.75);font-weight:400;padding-left:18px;position:relative;line-height:1.55;}
.pd-drawer-benefit::before{content:'—';position:absolute;left:0;color:var(--blue);font-weight:700;}

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
  .product-card.mob-hidden{display:none;}
  .products-see-all{display:flex;}
}
`;

function ProductModal({ product, onClose }) {
  if (!product) return null;
  const isWeekly = product.tag.toLowerCase().includes('weekly');
  const freqClass = product.comingSoon ? 'soon' : isWeekly ? 'weekly' : 'daily';
  const freqLabel = product.comingSoon ? 'COMING SOON' : isWeekly ? 'WEEKLY' : 'DAILY';

  return (
    <div className="pd-drawer open">
      <div className="pd-drawer-handle" />
      <div className="pd-drawer-header">
        {product.image
          ? <img src={product.image} alt={product.fullName} className="pd-drawer-img" />
          : <div className="pd-drawer-img-placeholder" />
        }
        <div className="pd-drawer-title-block">
          <div className="pd-drawer-num">PRODUCT · {product.num}</div>
          <div className="pd-drawer-name">{product.name}</div>
          <div className="pd-drawer-origin">
            {product.origin}
            {product.size && (
              <span style={{fontSize:10,letterSpacing:'1.5px',color:'var(--blit)',background:'rgba(46,109,164,0.12)',border:'1px solid rgba(46,109,164,0.25)',padding:'2px 7px',borderRadius:3}}>
                {product.size}
              </span>
            )}
          </div>
          <span className={`pd-drawer-freq ${freqClass}`}>{freqLabel}</span>
        </div>
        <button className="pd-drawer-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="pd-drawer-tagline">{product.tagline}</div>
      {product.lifespan && (
        <div style={{fontSize:11,color:'var(--stone)',padding:'8px 24px 0',letterSpacing:'.2px'}}>⏱ {product.lifespan}</div>
      )}
      {product.highlights?.length > 0 && (
        <div style={{display:'flex',flexWrap:'wrap',gap:5,padding:'10px 24px 0'}}>
          {product.highlights.map((h, i) => {
            const isWeekly = product.tag.toLowerCase().includes('weekly');
            const style = isWeekly
              ? {fontSize:10,letterSpacing:'1px',textTransform:'uppercase',fontWeight:700,color:'#d4a847',background:'rgba(200,169,110,0.15)',border:'1px solid rgba(200,169,110,0.5)',padding:'3px 8px',borderRadius:3}
              : {fontSize:10,letterSpacing:'1px',textTransform:'uppercase',fontWeight:700,color:'#7ab8e8',background:'rgba(46,109,164,0.15)',border:'1px solid rgba(46,109,164,0.5)',padding:'3px 8px',borderRadius:3};
            return <span key={i} style={style}>{h}</span>;
          })}
        </div>
      )}
      <div className="pd-drawer-desc">{product.desc}</div>
      {product.benefits.length > 0 && (
        <ul className="pd-drawer-benefits">
          {product.benefits.map((b, i) => (
            <li key={i} className="pd-drawer-benefit">{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ProductLineup() {
  const [allVisible, setAllVisible] = useState(false);
  const [selected, setSelected]     = useState(null);

  function openModal(p) { setSelected(p); }
  function closeModal()  { setSelected(null); }

  return (
    <>
      <style>{CSS}</style>

      <div className={`pd-backdrop${selected ? ' open' : ''}`} onClick={closeModal} />
      <ProductModal product={selected} onClose={closeModal} />

      <section className="products-section" id="products">
        <div className="products-header reveal">
          <div className="p-sec-left">
            <div className="p-sec-tag">Ten products. One system.</div>
            <h2 className="p-sec-title">The<br />Products.</h2>
          </div>
          <p className="p-sec-sub">
            Each product is numbered and used in sequence. Sourced from the country that does that tradition best.
          </p>
        </div>

        <div className="products-grid reveal">
          {PRODUCTS.map((p, idx) => {
            const isWeekly = p.tag.toLowerCase().includes('weekly');
            const freqLabel = isWeekly ? 'WEEKLY' : 'DAILY';
            const freqClass = p.comingSoon ? 'soon' : isWeekly ? 'weekly' : 'daily';

            return (
              <div
                key={p.num}
                className={`product-card${!allVisible && idx >= 4 ? ' mob-hidden' : ''}`}
              >
                <div className="prod-img-wrap" onClick={() => openModal(p)} style={{cursor:'pointer'}}>
                  <span className="prod-badge-num">{p.num}</span>
                  <span className={`prod-badge-freq ${freqClass}`}>
                    {p.comingSoon ? 'COMING SOON' : freqLabel}
                  </span>
                  {p.image
                    ? <img src={p.image} alt={p.fullName} loading="lazy" />
                    : (
                      <div className="prod-img-placeholder">
                        <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="25" y="40" width="50" height="80" rx="4" stroke="#2e6da4" strokeWidth="1.2" opacity=".5"/>
                          <text x="50" y="88" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill="#4a8fc7" opacity=".4" letterSpacing="2">{p.num}</text>
                        </svg>
                      </div>
                    )
                  }
                </div>
                <div className="prod-info">
                  <div className="prod-name">{p.name}</div>
                  <div className="prod-meta">
                    <span className="prod-origin">{p.origin}</span>
                    {p.size && <span className="prod-size">{p.size}</span>}
                  </div>
                  <div className="prod-tagline">{p.tagline}</div>
                  {p.highlights?.length > 0 && (
                    <div className="prod-highlights">
                      {p.highlights.map((h, i) => (
                        <span key={i} className={`prod-highlight ${freqClass === 'weekly' ? 'weekly' : freqClass === 'daily' ? 'daily' : 'neutral'}`}>{h}</span>
                      ))}
                    </div>
                  )}
                  {p.lifespan && <div className="prod-lifespan">⏱ {p.lifespan}</div>}
                  <button className="prod-view-details" onClick={() => openModal(p)}>
                    View Details ↓
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {!allVisible && (
          <button className="products-see-all" onClick={() => setAllVisible(true)}>
            See all 10 products <span className="products-see-all-arrow">↓</span>
          </button>
        )}
      </section>
    </>
  );
}
