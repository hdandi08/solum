import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products.js';
import { videoFor } from '../data/productMedia.js';
import Nav from '../components/Nav.jsx';
import SolumFooter from '../components/SolumFooter.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import { capture } from '../lib/analytics.js';

const CSS = `
.pp{background:var(--black);color:var(--bone);padding-top:64px;}
.pp-hero{position:relative;width:100%;aspect-ratio:9/16;max-height:86vh;background:#000;overflow:hidden;}
@media(min-width:769px){.pp-hero{aspect-ratio:16/10;max-height:80vh;}}
.pp-hero video,.pp-hero img{width:100%;height:100%;object-fit:cover;display:block;}
.pp-hero-overlay{position:absolute;left:0;bottom:0;padding:32px 24px;background:linear-gradient(transparent,rgba(8,9,11,.85));width:100%;}
.pp-num{font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.15em;color:var(--bone);opacity:.7;}
.pp-name{font-family:'Bebas Neue',sans-serif;font-size:clamp(40px,8vw,84px);letter-spacing:.04em;line-height:.92;margin:4px 0;}
.pp-tagline{font-size:17px;font-weight:300;color:var(--mist);max-width:520px;}
.pp-body{max-width:760px;margin:0 auto;padding:56px 24px;}
.pp-desc{font-size:16px;line-height:1.7;font-weight:300;color:var(--mist);}
.pp-gallery{display:grid;gap:2px;margin:40px 0;}
.pp-gallery img{width:100%;display:block;}
.pp-benefits{list-style:none;padding:0;margin:32px 0;display:flex;flex-direction:column;gap:14px;}
.pp-benefits li{font-size:15px;line-height:1.6;font-weight:300;color:var(--mist);padding-left:18px;position:relative;}
.pp-benefits li::before{content:'';position:absolute;left:0;top:9px;width:6px;height:6px;background:var(--blue);}
.pp-chips{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0;}
.pp-chip{font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:600;color:var(--bone);border:1px solid var(--line);padding:6px 12px;border-radius:3px;}
.pp-meta{display:flex;gap:24px;flex-wrap:wrap;font-size:13px;color:var(--stone);margin:20px 0;}
.pp-cta{display:inline-flex;align-items:center;gap:8px;background:var(--blue);color:var(--bone);font-weight:600;letter-spacing:2px;text-transform:uppercase;font-size:13px;padding:14px 28px;border-radius:4px;text-decoration:none;margin-top:8px;}
.pp-nav{display:flex;justify-content:space-between;border-top:1px solid var(--line);max-width:760px;margin:0 auto;padding:24px;font-size:13px;}
.pp-nav a{color:var(--blit);text-decoration:none;letter-spacing:1px;text-transform:uppercase;font-weight:600;}
`;

export default function ProductPage() {
  const { slug } = useParams();
  const idx = PRODUCTS.findIndex(p => p.slug === slug);
  const p = PRODUCTS[idx];

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
        <div className="pp-hero">
          {film
            ? <video key={slug} poster={heroPoster} muted autoPlay loop playsInline preload="none">
                <source src={film.webm} type="video/webm" />
                <source src={film.mp4} type="video/mp4" />
              </video>
            : <img key={slug} src={p.media?.still} alt={`${p.name} — SOLUM`} />}
          <div className="pp-hero-overlay">
            <div className="pp-num">PRODUCT · {p.num}</div>
            <h1 className="pp-name">{p.name}</h1>
            <p className="pp-tagline">{p.tagline}</p>
          </div>
        </div>

        <div className="pp-body">
          <div className="pp-meta">
            <span>{p.origin}</span>{p.size && <span>{p.size}</span>}{p.lifespan && <span>{p.lifespan}</span>}
          </div>
          <p className="pp-desc">{p.desc}</p>
          <div className="pp-chips">{(p.highlights || []).map(h => <span key={h} className="pp-chip">{h}</span>)}</div>
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

        <nav className="pp-nav">
          <Link to={`/product/${prev.slug}`}>← {prev.name}</Link>
          <Link to={`/product/${next.slug}`}>{next.name} →</Link>
        </nav>
      </article>
      <SolumFooter />
    </>
  );
}
