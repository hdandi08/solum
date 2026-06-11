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
.product-card{background:#09090c;display:flex;flex-direction:column;overflow:hidden;position:relative;cursor:default;}
.product-card:hover .prod-img-wrap img{transform:scale(1.04);}

/* Image — full bleed, no border */
.prod-img-wrap{position:relative;width:100%;aspect-ratio:3/4;overflow:hidden;background:#0d0e12;flex-shrink:0;}
.prod-img-wrap img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;transition:transform .5s ease;}
.prod-img-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}
.prod-img-placeholder svg{width:55%;height:55%;opacity:.45;}

/* Corner badges — sit on top of image */
.prod-badge-num{position:absolute;top:12px;left:12px;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;background:rgba(8,9,11,0.82);color:var(--bone);padding:3px 9px;z-index:2;backdrop-filter:blur(6px);}
.prod-badge-freq{position:absolute;top:12px;right:12px;font-size:9px;letter-spacing:3px;text-transform:uppercase;font-weight:700;padding:4px 8px;z-index:2;}
.prod-badge-freq.daily{background:var(--blue);color:var(--bone);}
.prod-badge-freq.weekly{background:#c8a96e;color:#08090b;}
.prod-badge-freq.soon{background:rgba(240,236,226,0.08);color:var(--stone);border:1px solid var(--lineb);}

/* Info area */
.prod-info{padding:18px 20px 22px;display:flex;flex-direction:column;gap:4px;flex:1;}
.prod-name{font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:var(--bone);font-weight:700;line-height:1.3;}
.prod-origin{font-size:12px;color:var(--stone);font-weight:300;letter-spacing:.3px;margin-top:1px;}
.prod-tagline{font-size:13px;font-weight:300;color:var(--mist);line-height:1.5;font-style:italic;margin-top:4px;}

/* ── Responsive ────────────────────────────────── */
@media(max-width:960px){
  .products-grid{grid-template-columns:repeat(3,1fr);}
}
@media(max-width:640px){
  .products-grid{grid-template-columns:repeat(2,1fr);}
  .products-section{padding:60px 0;}
  .products-header{padding:0 24px;gap:16px;}
  .p-sec-sub{text-align:left;max-width:none;}
  .prod-info{padding:14px 14px 18px;}
}
`;

export default function ProductLineup() {
  return (
    <>
      <style>{CSS}</style>
      <section className="products-section" id="products">
        <div className="products-header reveal">
          <div className="p-sec-left">
            <div className="p-sec-tag">The Products</div>
            <h2 className="p-sec-title">Ten Products.<br />One System.</h2>
          </div>
          <p className="p-sec-sub">
            Each product is numbered and used in sequence. Sourced from the country that does each tradition best.
          </p>
        </div>

        <div className="products-grid reveal">
          {PRODUCTS.map(p => {
            const isWeekly = p.tag.toLowerCase().includes('weekly');
            const freqLabel = isWeekly ? 'WEEKLY' : 'DAILY';
            const freqClass = p.comingSoon ? 'soon' : isWeekly ? 'weekly' : 'daily';

            return (
              <div key={p.num} className="product-card">
                <div className="prod-img-wrap">
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
                  <div className="prod-origin">{p.origin}</div>
                  <div className="prod-tagline">{p.tagline}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
