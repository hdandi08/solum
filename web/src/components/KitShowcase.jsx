import { useRef, useState } from 'react';
import { KITS } from '../data/kits.js';

const CSS = `
.ks-section{background:var(--black);padding:100px 48px;border-top:1px solid var(--line);}
.ks-inner{max-width:1100px;margin:0 auto;}
.ks-header{margin-bottom:48px;text-align:center;}
.ks-header .k-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.ks-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:16px;}
.ks-header p{font-size:16px;color:var(--mist);font-weight:300;line-height:1.7;max-width:520px;margin:0 auto;}
.ks-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:40px;}
.ks-panel-name{font-size:14px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--bone);margin-bottom:14px;text-align:center;}
.ks-gallery{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;border:1px solid var(--line);background:var(--black);}
.ks-gallery::-webkit-scrollbar{display:none;}
.ks-slide{flex:0 0 100%;scroll-snap-align:center;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;background:var(--black);}
.ks-slide img{width:100%;height:100%;object-fit:contain;display:block;}
.ks-dots{display:flex;justify-content:center;gap:8px;margin-top:14px;}
.ks-dot{width:7px;height:7px;border-radius:50%;border:none;padding:0;background:var(--line);cursor:pointer;transition:background .2s,transform .2s;}
.ks-dot.on{background:var(--blue);transform:scale(1.25);}
@media(max-width:768px){
  .ks-section{padding:64px 0;}
  .ks-inner{max-width:none;}
  .ks-header{padding:0 24px;margin-bottom:32px;}
  .ks-grid{grid-template-columns:1fr;gap:32px;padding:0 24px;}
}
`;

function KitGallery({ name, images }) {
  const ref = useRef(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="ks-panel">
      <div className="ks-panel-name">{name}</div>
      <div className="ks-gallery" ref={ref} onScroll={onScroll}>
        {images.map((src, i) => (
          <div className="ks-slide" key={src}>
            <img src={src} alt={`${name} kit — view ${i + 1}`} loading="lazy" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="ks-dots">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              className={`ks-dot${i === active ? ' on' : ''}`}
              aria-label={`View ${name} photo ${i + 1}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function KitShowcase() {
  const kits = KITS.filter(k => !k.hidden && (k.gallery?.length || k.image));
  if (!kits.length) return null;

  return (
    <>
      <style>{CSS}</style>
      <section className="ks-section" id="kit-showcase">
        <div className="ks-inner">
          <div className="ks-header">
            <div className="k-sec-tag">The Kit</div>
            <h2>Inside the Kit</h2>
            <p>Every product, laid out. Take a proper look at exactly what arrives.</p>
          </div>
          <div className="ks-grid">
            {kits.map(k => (
              <KitGallery key={k.id} name={k.name} images={k.gallery?.length ? k.gallery : [k.image]} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
