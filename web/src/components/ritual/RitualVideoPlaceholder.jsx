import { PRODUCTS } from '../../data/products.js';

const CSS = `
.rvp{position:relative;aspect-ratio:16/9;background:var(--dark);display:flex;align-items:center;justify-content:center;overflow:hidden;border-right:1px solid var(--line);}
.rvp-bg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;opacity:0.18;}
.rvp-glow{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(46,109,164,0.1),transparent 65%);z-index:1;}
.rvp-glow.weekly{background:radial-gradient(circle at 50% 50%,rgba(200,169,110,0.08),transparent 65%);}
.rvp-ghost{position:absolute;font-family:'Bebas Neue',sans-serif;font-size:110px;letter-spacing:-2px;color:transparent;-webkit-text-stroke:1px rgba(46,109,164,0.07);user-select:none;pointer-events:none;z-index:2;}
.rvp-ghost.weekly{-webkit-text-stroke-color:rgba(200,169,110,0.06);}
.rvp-play{position:relative;z-index:3;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(46,109,164,0.45);background:rgba(46,109,164,0.1);}
.rvp-play.weekly{border-color:rgba(200,169,110,0.4);background:rgba(200,169,110,0.08);}
.rvp-triangle{width:0;height:0;border-style:solid;border-width:11px 0 11px 20px;border-color:transparent transparent transparent var(--blue);margin-left:5px;}
.rvp-triangle.weekly{border-color:transparent transparent transparent #c8a96e;}
.rvp-tag{position:absolute;top:14px;left:16px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);background:rgba(8,9,11,0.7);padding:5px 10px;backdrop-filter:blur(4px);z-index:4;}
.rvp-dur{position:absolute;bottom:14px;right:16px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);z-index:4;}
@media(max-width:900px){.rvp{border-right:none;border-bottom:1px solid var(--line);}}
`;

export default function RitualVideoPlaceholder({ productNum, time, variant = 'daily' }) {
  const product = PRODUCTS.find(p => p.num === productNum);
  return (
    <>
      <style>{CSS}</style>
      <div className="rvp">
        {product?.image && (
          <img src={product.image} alt={product.name} className="rvp-bg-img" loading="lazy" />
        )}
        <div className={`rvp-glow ${variant}`} />
        <div className={`rvp-ghost ${variant}`}>{productNum}</div>
        <div className={`rvp-play ${variant}`}>
          <div className={`rvp-triangle ${variant}`} />
        </div>
        <div className="rvp-tag">Video Coming Soon</div>
        <div className="rvp-dur">{time}</div>
      </div>
    </>
  );
}
