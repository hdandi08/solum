import { capture } from '../lib/analytics.js';
import { PRODUCTS } from '../data/products.js';
import { videoFor } from '../data/productMedia.js';

const GOLD = '#c8a96e';
const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const STEPS = [
  { num: '04', slug: '04-scalp-massager',   name: 'Scalp Massager',   freq: 'daily',  action: 'Firm circles, hairline to crown.' },
  { num: '01', slug: '01-body-wash',        name: 'Body Wash',        freq: 'daily',  action: 'Lather chest-down. Cleans, never strips.' },
  { num: '02', slug: '02-italy-towel-mitt', name: 'Italy Towel Mitt', freq: 'daily',  action: 'Long strokes. Dead skin lifts off.' },
  { num: '03', slug: '03-back-scrub-cloth', name: 'Back Scrub Cloth', freq: 'daily',  action: 'Drape, saw shoulder to lower back.' },
  { num: '07', slug: '07-body-lotion',      name: 'Body Lotion',      freq: 'daily',  action: 'Within 3 minutes of towelling.' },
  { num: '05', slug: '05-atlas-clay',       name: 'Atlas Clay Mask',  freq: 'weekly', action: 'Head to toe. Draws out the deep stuff.' },
  { num: '06', slug: '06-argan-oil',        name: 'Argan Body Oil',   freq: 'weekly', action: 'Press into damp skin. Fully fed.' },
];

const CSS = `
.ria-section{background:var(--black);border-top:1px solid var(--line);padding:80px 0;}
.ria-head-wrap{max-width:760px;margin:0 auto;padding:0 24px;}
.ria-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;text-align:center;margin-bottom:14px;}
.ria-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,6vw,64px);letter-spacing:.04em;color:var(--bone);line-height:.95;text-align:center;margin-bottom:12px;}
.ria-sub{font-size:15px;font-weight:300;color:var(--stone);text-align:center;margin:0 auto 36px;max-width:480px;line-height:1.6;}

.ria-strip{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;padding:4px 24px 16px;-webkit-overflow-scrolling:touch;scrollbar-width:thin;}
.ria-strip::-webkit-scrollbar{height:6px;}
.ria-strip::-webkit-scrollbar-thumb{background:var(--line);}

.ria-tile{position:relative;flex:0 0 clamp(200px,22vw,260px);aspect-ratio:9/16;scroll-snap-align:start;overflow:hidden;background:#000;border:1px solid var(--line);}
.ria-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.ria-scrim{position:absolute;inset:0;background:linear-gradient(to top,rgba(8,9,11,0.88),rgba(8,9,11,0.15) 50%,rgba(8,9,11,0) 72%);}
.ria-overlay{position:absolute;left:0;right:0;bottom:0;padding:14px;display:flex;flex-direction:column;gap:6px;}
.ria-badges{display:flex;align-items:center;gap:6px;}
.ria-num{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.08em;color:var(--bone);background:rgba(8,9,11,0.55);border:1px solid rgba(240,236,226,0.3);padding:2px 7px;}
.ria-freq{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;padding:2px 7px;border:1px solid;}
.ria-freq.daily{color:var(--blit);border-color:rgba(46,109,164,0.45);background:rgba(46,109,164,0.12);}
.ria-freq.weekly{color:${GOLD};border-color:rgba(200,169,110,0.45);background:rgba(200,169,110,0.12);}
.ria-name{font-family:'Bebas Neue',sans-serif;font-size:19px;letter-spacing:.04em;color:var(--bone);line-height:1.05;}
.ria-action{font-size:13px;font-weight:300;color:var(--mist);line-height:1.4;}

.ria-more{display:flex;justify-content:center;margin-top:8px;}
.ria-more a{display:inline-flex;align-items:center;gap:8px;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;color:var(--bone);text-decoration:none;padding:12px 28px;border:1px solid rgba(240,236,226,0.25);transition:border-color .2s;}
.ria-more a:hover{border-color:var(--bone);}
.ria-more svg{transition:transform .2s;}
.ria-more a:hover svg{transform:translateX(3px);}

@media(max-width:768px){
  .ria-section{padding:60px 0;}
}
`;

const ARROW = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7h10M8 3l4 4-4 4" />
  </svg>
);

function Tile({ step }) {
  const film = videoFor(step.slug);
  const prod = PRODUCTS.find(p => p.num === step.num);
  const photo = prod?.media?.gallery?.[0] || prod?.media?.still;
  const showVideo = !!film && !REDUCE_MOTION;

  return (
    <div className="ria-tile">
      {showVideo ? (
        <video
          className="ria-media"
          poster={film.poster || photo}
          muted
          autoPlay
          loop
          playsInline
          preload="none"
        >
          <source src={film.webm} type="video/webm" />
          <source src={film.mp4} type="video/mp4" />
        </video>
      ) : (
        <img className="ria-media" src={photo} alt={`${step.name} — in use`} loading="lazy" />
      )}
      <div className="ria-scrim" />
      <div className="ria-overlay">
        <div className="ria-badges">
          <span className="ria-num">{step.num}</span>
          <span className={`ria-freq ${step.freq}`}>{step.freq}</span>
        </div>
        <span className="ria-name">{step.name}</span>
        <span className="ria-action">{step.action}</span>
      </div>
    </div>
  );
}

export default function RitualInAction() {
  return (
    <>
      <style>{CSS}</style>
      <section className="ria-section" id="ritual">
        <div className="ria-head-wrap">
          <div className="ria-eyebrow reveal">The Ritual</div>
          <h2 className="ria-head reveal">Ritual in Action.</h2>
          <p className="ria-sub reveal">Every step, on real skin. Daily keeps you maintained — weekly resets you.</p>
        </div>

        <div className="ria-strip">
          {STEPS.map(step => <Tile key={step.slug} step={step} />)}
        </div>

        <div className="ria-more reveal">
          <a href="/ritual" onClick={() => capture('ritual_cta_clicked', { source: 'ritual_in_action' })}>
            See the full ritual {ARROW}
          </a>
        </div>
      </section>
    </>
  );
}
