import { useEffect, useRef, useState } from 'react';
import { capture } from '../lib/analytics.js';
import { markRitualProgress } from '../lib/qualifiedVisitTracker.js';
import { PRODUCTS } from '../data/products.js';
import { videoFor } from '../data/productMedia.js';

const GOLD = '#c8a96e';
const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Composition mirrors the canonical ritual in ritualVideo.js (RITUALS).
// Daily: 04, 01, 03, 08, 07.  Weekly: 05, 02, 06.
const STEPS = [
  { num: '04', slug: '04-scalp-massager',   name: 'Scalp Massager',   freq: 'daily',  action: 'Firm circles, hairline to crown.' },
  { num: '01', slug: '01-body-wash',        name: 'Body Wash',        freq: 'daily',  action: 'Lather chest-down. Cleans, never strips.' },
  { num: '03', slug: '03-back-scrub-cloth', name: 'Back Scrub Cloth', freq: 'daily',  action: 'Drape, saw shoulder to lower back.' },
  { num: '08', slug: '08-cleansing-cloth',  name: 'Cleansing Cloth',  freq: 'daily',  action: 'Gentle daily cleanse, where it matters.' },
  { num: '07', slug: '07-body-lotion',      name: 'Body Lotion',      freq: 'daily',  action: 'Within 3 min of towelling. Skin absorbs 70% more.' },
  { num: '05', slug: '05-atlas-clay',       name: 'Atlas Clay Mask',  freq: 'weekly', action: 'Head to toe. Draws out the deep stuff.' },
  { num: '02', slug: '02-italy-towel-mitt', name: 'Italy Towel Mitt', freq: 'weekly', action: 'Long strokes. Dead skin lifts off.' },
  { num: '06', slug: '06-argan-oil',        name: 'Argan Body Oil',   freq: 'weekly', action: 'Press into damp skin. Fully fed.' },
];

function posterFor(num) {
  const prod = PRODUCTS.find(p => p.num === num);
  return prod?.media?.gallery?.[0] || prod?.media?.still || '';
}

const CSS = `
.ria-section{background:var(--black);border-top:1px solid var(--line);padding:80px 0;}
.ria-head-wrap{max-width:760px;margin:0 auto;padding:0 24px;}
.ria-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;text-align:center;margin-bottom:14px;}
.ria-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,6vw,64px);letter-spacing:.04em;color:var(--bone);line-height:.95;text-align:center;margin-bottom:12px;}
.ria-sub{font-size:15px;font-weight:300;color:var(--stone);text-align:center;margin:0 auto 36px;max-width:480px;line-height:1.6;}

/* player: feature + rail */
.ria-player{max-width:1040px;margin:0 auto;padding:0 24px;display:flex;flex-direction:column;gap:20px;}
.ria-stage{position:relative;aspect-ratio:9/16;width:100%;max-width:340px;margin:0 auto;overflow:hidden;background:#000;border:1px solid var(--line);}
.ria-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.ria-scrim{position:absolute;inset:0;background:linear-gradient(to top,rgba(8,9,11,0.85),rgba(8,9,11,0.1) 52%,rgba(8,9,11,0) 72%);pointer-events:none;}
.ria-stage-overlay{position:absolute;left:0;right:0;bottom:0;padding:16px;display:flex;flex-direction:column;gap:6px;pointer-events:none;}
.ria-badges{display:flex;align-items:center;gap:6px;}
.ria-num{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.08em;color:var(--bone);background:rgba(8,9,11,0.55);border:1px solid rgba(240,236,226,0.3);padding:2px 7px;}
.ria-freq{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;padding:2px 7px;border:1px solid;}
.ria-freq.daily{color:var(--blit);border-color:rgba(46,109,164,0.45);background:rgba(46,109,164,0.12);}
.ria-freq.weekly{color:${GOLD};border-color:rgba(200,169,110,0.45);background:rgba(200,169,110,0.12);}
.ria-stage-name{font-family:'Bebas Neue',sans-serif;font-size:23px;letter-spacing:.04em;color:var(--bone);line-height:1.05;}
.ria-stage-action{font-size:14px;font-weight:300;color:var(--mist);line-height:1.45;}

/* rail */
.ria-rail{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.ria-thumb{position:relative;display:flex;flex-direction:column;gap:6px;background:var(--char);border:1px solid var(--line);padding:0;cursor:pointer;overflow:hidden;text-align:left;transition:border-color .2s;}
.ria-thumb:hover{border-color:rgba(240,236,226,0.4);}
.ria-thumb.active{border-color:var(--blit);}
.ria-thumb-img{width:100%;aspect-ratio:1;object-fit:cover;display:block;}
.ria-thumb-meta{display:flex;flex-direction:column;gap:3px;padding:8px 9px 10px;}
.ria-thumb-badges{display:flex;align-items:center;gap:5px;}
.ria-thumb-name{font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.03em;color:var(--bone);line-height:1.05;}

.ria-more{display:flex;justify-content:center;margin-top:8px;}
.ria-more a{display:inline-flex;align-items:center;gap:8px;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;color:var(--bone);text-decoration:none;padding:12px 28px;border:1px solid rgba(240,236,226,0.25);transition:border-color .2s;}
.ria-more a:hover{border-color:var(--bone);}
.ria-more svg{transition:transform .2s;}
.ria-more a:hover svg{transform:translateX(3px);}

@media(min-width:769px){
  .ria-player{display:grid;grid-template-columns:340px 1fr;gap:40px;align-items:start;}
  .ria-stage{margin:0;}
  .ria-rail{grid-template-columns:repeat(2,1fr);align-self:stretch;}
  .ria-more{grid-column:1 / -1;}
}
@media(max-width:768px){
  .ria-section{padding:60px 0;}
  .ria-rail{display:flex;overflow-x:auto;gap:10px;padding-bottom:6px;-webkit-overflow-scrolling:touch;scrollbar-width:thin;}
  .ria-thumb{flex:0 0 132px;}
}
`;

const ARROW = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7h10M8 3l4 4-4 4" />
  </svg>
);

export default function RitualInAction() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [userSelected, setUserSelected] = useState(false);
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const progressFired = useRef(new Set());

  const step = STEPS[activeIdx];
  const film = videoFor(step.slug);
  const poster = (film && film.poster) || posterFor(step.num);
  const showVideo = !!film && !REDUCE_MOTION;

  // Play the single feature only while the section is in view (muted autoplay).
  useEffect(() => {
    if (!showVideo) return;
    const el = stageRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = videoRef.current;
        if (!v) return;
        if (e.isIntersecting) { v.play().catch(() => {}); }
        else { v.pause(); }
      });
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [showVideo, activeIdx]);

  function selectStep(i) {
    if (i === activeIdx && userSelected) return; // already the deliberate selection
    progressFired.current = new Set();
    setActiveIdx(i);
    setUserSelected(true);
    capture('ritual_selected', { product: STEPS[i].slug, source: 'ritual_in_action' });
    if (i === activeIdx) {
      // same tile, no remount — restart so this intentful play tracks from 0
      const v = videoRef.current;
      if (v) { try { v.currentTime = 0; v.play().catch(() => {}); } catch { /* ignore */ } }
    }
  }

  function onTimeUpdate(e) {
    if (!userSelected) return; // autoplay-first never counts as intent
    const v = e.currentTarget;
    if (!v.duration) return;
    const pct = Math.round((v.currentTime / v.duration) * 100);
    for (const m of [25, 50, 75, 100]) {
      if (pct >= m && !progressFired.current.has(m)) {
        progressFired.current.add(m);
        capture('ritual_video_progress', { product: step.slug, percent: m, source: 'ritual_in_action' });
        markRitualProgress(m);
      }
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <section className="ria-section" id="ritual">
        <div className="ria-head-wrap">
          <div className="ria-eyebrow reveal">The Ritual</div>
          <h2 className="ria-head reveal">Ritual in Action.</h2>
          <p className="ria-sub reveal">Every step, on real skin. Daily keeps you maintained. Weekly resets you.</p>
        </div>

        <div className="ria-player reveal">
          <div className="ria-stage" ref={stageRef}>
            {showVideo ? (
              <video
                key={activeIdx}
                ref={videoRef}
                className="ria-media"
                poster={poster}
                muted
                autoPlay
                loop
                playsInline
                preload="none"
                onTimeUpdate={onTimeUpdate}
              >
                <source src={film.webm} type="video/webm" />
                <source src={film.mp4} type="video/mp4" />
              </video>
            ) : (
              <img className="ria-media" src={poster} alt={`${step.name} in use`} loading="lazy" />
            )}
            <div className="ria-scrim" />
            <div className="ria-stage-overlay">
              <div className="ria-badges">
                <span className="ria-num">{step.num}</span>
                <span className={`ria-freq ${step.freq}`}>{step.freq}</span>
              </div>
              <span className="ria-stage-name">{step.name}</span>
              <span className="ria-stage-action">{step.action}</span>
            </div>
          </div>

          <div className="ria-rail" role="tablist" aria-label="Ritual steps">
            {STEPS.map((s, i) => (
              <button
                key={s.slug}
                className={`ria-thumb${i === activeIdx ? ' active' : ''}`}
                role="tab"
                aria-selected={i === activeIdx}
                aria-label={`Play ${s.name}`}
                onClick={() => selectStep(i)}
              >
                <img className="ria-thumb-img" src={posterFor(s.num)} alt={`${s.name}`} loading="lazy" />
                <span className="ria-thumb-meta">
                  <span className="ria-thumb-badges">
                    <span className="ria-num">{s.num}</span>
                    <span className={`ria-freq ${s.freq}`}>{s.freq}</span>
                  </span>
                  <span className="ria-thumb-name">{s.name}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="ria-more reveal">
            <a href="/ritual" onClick={() => capture('ritual_cta_clicked', { source: 'ritual_in_action' })}>
              See the full ritual {ARROW}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
