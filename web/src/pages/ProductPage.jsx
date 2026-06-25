import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PRODUCTS } from '../data/products.js';
import { videoFor } from '../data/productMedia.js';
import Nav from '../components/Nav.jsx';
import SolumFooter from '../components/SolumFooter.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import { capture } from '../lib/analytics.js';

const CSS = `
.pp{background:var(--black);color:var(--bone);padding-top:64px;}
/* back bar — one level below the global header (NOT a <nav>, so the global nav{position:fixed} rule can't pin it) */
.pp-subbar{position:sticky;top:64px;z-index:90;display:flex;align-items:center;background:rgba(8,9,11,0.82);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);padding:9px 24px;}
.pp-back{display:inline-flex;align-items:center;gap:9px;background:none;border:none;color:var(--bone);font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600;cursor:pointer;padding:4px 0;transition:color .2s;}
.pp-back:hover{color:var(--blit);}
.pp-back svg{transition:transform .2s;}
.pp-back:hover svg{transform:translateX(-3px);}
/* HERO — mobile: media full-width on top, info below. Desktop: split (vertical media | info). */
.pp-hero{display:grid;grid-template-columns:1fr;background:#000;}
.pp-hero-media{position:relative;width:100%;aspect-ratio:9/16;max-height:88vh;background:#000;overflow:hidden;}
.pp-hero-media video,.pp-hero-media img{width:100%;height:100%;object-fit:cover;display:block;}
.pp-hero-info{display:flex;flex-direction:column;justify-content:center;gap:15px;padding:36px 24px 44px;}
@media(min-width:769px){
  /* Cap the hero to the viewport (minus the 64px nav + 43px back bar) so the vertical media
     cover-fills its column and the whole hero — incl. the Shop CTA — fits on one screen. */
  .pp-hero{grid-template-columns:1fr 1fr;height:calc(100vh - 107px);min-height:540px;max-height:860px;align-items:stretch;}
  .pp-hero-media{aspect-ratio:auto;height:100%;max-height:none;}
  .pp-hero-media video,.pp-hero-media img{height:100%;object-fit:cover;}
  .pp-hero-info{padding:48px 6vw;}
}
.pp-num{font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.15em;color:var(--blit);}
.pp-name{font-family:'Bebas Neue',sans-serif;font-size:clamp(40px,6.5vw,74px);letter-spacing:.04em;line-height:.92;margin:2px 0;color:var(--bone);}
.pp-tagline{font-size:17px;font-weight:300;color:var(--mist);max-width:460px;line-height:1.4;}
.pp-body{max-width:760px;margin:0 auto;padding:56px 24px;}
.pp-desc{font-size:16px;line-height:1.7;font-weight:300;color:var(--mist);}
.pp-gallery{display:grid;grid-template-columns:1fr;gap:10px;max-width:760px;margin:48px auto;padding:0 24px;}
@media(min-width:769px){.pp-gallery{grid-template-columns:1fr 1fr;gap:12px;max-width:1000px;padding:0;}}
.pp-gallery img{width:100%;height:100%;object-fit:cover;aspect-ratio:3/4;display:block;border:1px solid var(--line);}
.pp-benefits{list-style:none;padding:0;margin:32px 0;display:flex;flex-direction:column;gap:14px;}
.pp-benefits li{font-size:15px;line-height:1.6;font-weight:300;color:var(--mist);padding-left:18px;position:relative;}
.pp-benefits li::before{content:'';position:absolute;left:0;top:9px;width:6px;height:6px;background:var(--blue);}
.pp-chips{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0;}
.pp-chip{font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:600;color:var(--bone);border:1px solid var(--line);padding:6px 12px;border-radius:3px;}
.pp-meta{display:flex;gap:24px;flex-wrap:wrap;font-size:13px;color:var(--stone);margin:20px 0;}
.pp-cta{display:inline-flex;align-items:center;gap:8px;background:var(--blue);color:var(--bone);font-weight:600;letter-spacing:2px;text-transform:uppercase;font-size:13px;padding:14px 28px;border-radius:4px;text-decoration:none;margin-top:8px;}
/* bottom product navigator (a div — must not be a <nav>, or the global nav{position:fixed} rule pins it to the header) */
.pp-nav{display:flex;justify-content:space-between;gap:16px;border-top:1px solid var(--line);max-width:760px;margin:0 auto;padding:30px 24px 52px;}
.pp-nav-link{display:flex;flex-direction:column;gap:5px;text-decoration:none;max-width:48%;}
.pp-nav-link.next{align-items:flex-end;text-align:right;margin-left:auto;}
.pp-nav-eyebrow{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.pp-nav-name{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.04em;color:var(--bone);line-height:1.05;transition:color .2s;}
.pp-nav-link:hover .pp-nav-name{color:var(--blit);}
`;

const BACK_ARROW = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 7H2M6 3 2 7l4 4" />
  </svg>
);

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const idx = PRODUCTS.findIndex(p => p.slug === slug);
  const p = PRODUCTS[idx];

  // Land at the top of the page on navigation (incl. prev/next between products), not at the
  // retained scroll position of wherever the click came from.
  useEffect(() => { window.scrollTo({ top: 0, left: 0 }); }, [slug]);

  // Return to wherever they came from; fall back to the homepage products grid on a direct landing.
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/#products');
  };

  useEffect(() => {
    if (!p) return;
    document.title = `${p.fullName || p.name} · SOLUM`;
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', p.tagline || p.desc?.slice(0, 150) || '');
    let c = document.querySelector('link[rel="canonical"]');
    if (c) c.setAttribute('href', `https://bysolum.co.uk/product/${slug}`);
    capture('product_page_viewed', { slug });
  }, [p, slug]);

  if (!p) return <NotFoundPage />;

  const active = PRODUCTS.filter(x => !x.comingSoon);
  const myActiveIdx = active.findIndex(x => x.slug === slug);
  const prev = active[(myActiveIdx - 1 + active.length) % active.length];
  const next = active[(myActiveIdx + 1) % active.length];
  const film = videoFor(slug);
  const heroPoster = p.media?.poster || p.media?.still;

  return (
    <>
      <style>{CSS}</style>
      <Nav />
      <article className="pp">
        <div className="pp-subbar">
          <button className="pp-back" onClick={goBack}>{BACK_ARROW} Back</button>
        </div>
        <div className="pp-hero">
          <div className="pp-hero-media">
            {film
              ? <video key={slug} poster={heroPoster} muted autoPlay loop playsInline preload="none">
                  <source src={film.webm} type="video/webm" />
                  <source src={film.mp4} type="video/mp4" />
                </video>
              : <img key={slug} src={p.media?.still} alt={`${p.name} — SOLUM`} />}
          </div>
          <div className="pp-hero-info">
            <div className="pp-num">PRODUCT · {p.num}</div>
            <h1 className="pp-name">{p.name}</h1>
            <p className="pp-tagline">{p.tagline}</p>
            <div className="pp-meta">
              <span>{p.origin}</span>{p.size && <span>{p.size}</span>}{p.lifespan && <span>{p.lifespan}</span>}
            </div>
            <div className="pp-chips">{(p.highlights || []).map(h => <span key={h} className="pp-chip">{h}</span>)}</div>
            <div><Link to="/buy" className="pp-cta" onClick={() => capture('product_buy_clicked', { slug })}>Shop the kits</Link></div>
          </div>
        </div>

        <div className="pp-body">
          <p className="pp-desc">{p.desc}</p>
        </div>

        {(p.media?.gallery || []).length > 0 && (
          <div className="pp-gallery">
            {p.media.gallery.map((src, i) => (
              <img key={src} src={src} alt={`${p.name} in use ${i + 1}`} loading="lazy" />
            ))}
          </div>
        )}

        <div className="pp-body">
          {(p.benefits || []).length > 0 && (
            <ul className="pp-benefits">{p.benefits.map(b => <li key={b}>{b}</li>)}</ul>
          )}
          <Link to="/ritual" className="pp-chip" style={{ display: 'inline-block', marginRight: 8 }}>See the ritual ↗</Link>
          <div><Link to="/buy" className="pp-cta" onClick={() => capture('product_buy_clicked', { slug })}>Shop the kits</Link></div>
        </div>

        <div className="pp-nav">
          <Link className="pp-nav-link prev" to={`/product/${prev.slug}`}>
            <span className="pp-nav-eyebrow">← Previous</span>
            <span className="pp-nav-name">{prev.name}</span>
          </Link>
          <Link className="pp-nav-link next" to={`/product/${next.slug}`}>
            <span className="pp-nav-eyebrow">Next →</span>
            <span className="pp-nav-name">{next.name}</span>
          </Link>
        </div>
      </article>
      <SolumFooter />
    </>
  );
}
