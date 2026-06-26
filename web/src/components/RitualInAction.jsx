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

/* shared media bits */
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

/* ── desktop player: feature + rail ── */
.ria-player{max-width:1040px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:340px 1fr;gap:40px;align-items:start;}
.ria-stage{position:relative;aspect-ratio:9/16;width:100%;overflow:hidden;background:#000;border:1px solid var(--line);}
.ria-rail{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;align-self:stretch;}
.ria-thumb{position:relative;display:flex;flex-direction:column;gap:6px;background:var(--char);border:1px solid var(--line);padding:0;cursor:pointer;overflow:hidden;text-align:left;transition:border-color .2s;}
.ria-thumb:hover{border-color:rgba(240,236,226,0.4);}
.ria-thumb.active{border-color:var(--blit);}
.ria-thumb-img{width:100%;aspect-ratio:1;object-fit:cover;display:block;}
.ria-thumb-meta{display:flex;flex-direction:column;gap:3px;padding:8px 9px 10px;}
.ria-thumb-badges{display:flex;align-items:center;gap:5px;}
.ria-thumb-name{font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.03em;color:var(--bone);line-height:1.05;}
.ria-thumb-cue{position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:rgba(8,9,11,0.55);border:1px solid rgba(240,236,226,0.5);display:flex;align-items:center;justify-content:center;color:var(--bone);}

/* ── mobile swipe carousel ── */
.ria-carousel{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;padding:0 11vw 6px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.ria-carousel::-webkit-scrollbar{display:none;}
.ria-card{flex:0 0 78vw;max-width:360px;scroll-snap-align:center;}
.ria-card-media{position:relative;width:100%;height:64vh;max-height:600px;overflow:hidden;background:#000;border:1px solid var(--line);}
.ria-card-cue{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:56px;height:56px;border-radius:50%;background:rgba(46,109,164,0.6);border:1.5px solid var(--bone);display:flex;align-items:center;justify-content:center;color:var(--bone);backdrop-filter:blur(2px);pointer-events:none;}
.ria-dots{display:flex;justify-content:center;align-items:center;gap:8px;margin-top:18px;padding:0 24px;flex-wrap:wrap;}
.ria-dot{width:7px;height:7px;border-radius:50%;background:rgba(240,236,226,0.22);border:none;padding:0;cursor:pointer;transition:background .25s,width .25s;}
.ria-dot.active{background:var(--blit);width:20px;border-radius:4px;}

.ria-more{display:flex;justify-content:center;margin-top:24px;}
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

const PLAY = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const PLAY_SM = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export default function RitualInAction() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width:768px)').matches
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [userSelected, setUserSelected] = useState(false);

  // desktop refs
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  // mobile refs
  const carouselRef = useRef(null);
  const cardRefs = useRef([]);
  const vidRefs = useRef([]);
  const firstSettle = useRef(true);

  const progressFired = useRef(new Set());

  const step = STEPS[activeIdx];
  const film = videoFor(step.slug);
  const poster = (film && film.poster) || posterFor(step.num);
  const showVideo = !!film && !REDUCE_MOTION;

  // Track viewport so only one structure (desktop player OR mobile carousel) mounts.
  useEffect(() => {
    const mq = window.matchMedia('(max-width:768px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // DESKTOP: play the single feature only while the section is in view.
  useEffect(() => {
    if (isMobile || !showVideo) return;
    const el = stageRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = videoRef.current;
        if (!v) return;
        if (e.isIntersecting) { v.play().catch(() => {}); } else { v.pause(); }
      });
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isMobile, showVideo, activeIdx]);

  // MOBILE: the centred card plays; others pause. The first settle is passive (no intent);
  // any subsequent swipe / dot-jump counts as a deliberate selection.
  useEffect(() => {
    if (!isMobile) return;
    const root = carouselRef.current;
    if (!root) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!(e.isIntersecting && e.intersectionRatio >= 0.6)) return;
        const i = Number(e.target.dataset.idx);
        setActiveIdx(i);
        progressFired.current = new Set();
        vidRefs.current.forEach((v, idx) => {
          if (!v) return;
          if (idx === i) { v.play().catch(() => {}); } else { v.pause(); }
        });
        if (firstSettle.current) { firstSettle.current = false; return; } // initial card = passive
        setUserSelected(true);
        capture('ritual_selected', { product: STEPS[i].slug, source: 'ritual_in_action' });
      });
    }, { root, threshold: [0.6] });
    cardRefs.current.forEach((c) => c && obs.observe(c));
    return () => obs.disconnect();
  }, [isMobile]);

  function goToCard(i) {
    cardRefs.current[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  // DESKTOP: click a thumbnail to select + play.
  function selectStep(i) {
    if (i === activeIdx && userSelected) return;
    progressFired.current = new Set();
    setActiveIdx(i);
    setUserSelected(true);
    capture('ritual_selected', { product: STEPS[i].slug, source: 'ritual_in_action' });
    if (i === activeIdx) {
      const v = videoRef.current;
      if (v) { try { v.currentTime = 0; v.play().catch(() => {}); } catch { /* ignore */ } }
    }
  }

  // Fires for the active, user-selected video only. Autoplay-first never counts as intent.
  function fireProgress(e, idx, slug) {
    if (!userSelected || idx !== activeIdx) return;
    const v = e.currentTarget;
    if (!v.duration) return;
    const pct = Math.round((v.currentTime / v.duration) * 100);
    for (const m of [25, 50, 75, 100]) {
      if (pct >= m && !progressFired.current.has(m)) {
        progressFired.current.add(m);
        capture('ritual_video_progress', { product: slug, percent: m, source: 'ritual_in_action' });
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

        {isMobile ? (
          <>
            <div className="ria-carousel" ref={carouselRef} role="tablist" aria-label="Ritual steps">
              {STEPS.map((s, i) => {
                const f = videoFor(s.slug);
                const vid = !!f && !REDUCE_MOTION;
                const pos = (f && f.poster) || posterFor(s.num);
                return (
                  <div
                    className="ria-card"
                    key={s.slug}
                    data-idx={i}
                    ref={(el) => { cardRefs.current[i] = el; }}
                  >
                    <div className="ria-card-media">
                      {vid ? (
                        <video
                          ref={(el) => { vidRefs.current[i] = el; }}
                          className="ria-media"
                          poster={pos}
                          muted
                          loop
                          playsInline
                          preload="none"
                          onTimeUpdate={(e) => fireProgress(e, i, s.slug)}
                        >
                          <source src={f.webm} type="video/webm" />
                          <source src={f.mp4} type="video/mp4" />
                        </video>
                      ) : (
                        <img className="ria-media" src={pos} alt={`${s.name} in use`} loading="lazy" />
                      )}
                      <div className="ria-scrim" />
                      {vid && i !== activeIdx && <span className="ria-card-cue">{PLAY}</span>}
                      <div className="ria-stage-overlay">
                        <div className="ria-badges">
                          <span className="ria-num">{s.num}</span>
                          <span className={`ria-freq ${s.freq}`}>{s.freq}</span>
                        </div>
                        <span className="ria-stage-name">{s.name}</span>
                        <span className="ria-stage-action">{s.action}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="ria-dots" role="tablist" aria-label="Ritual steps">
              {STEPS.map((s, i) => (
                <button
                  key={s.slug}
                  className={`ria-dot${i === activeIdx ? ' active' : ''}`}
                  aria-label={`Go to ${s.name}`}
                  aria-selected={i === activeIdx}
                  onClick={() => goToCard(i)}
                />
              ))}
            </div>
          </>
        ) : (
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
                  onTimeUpdate={(e) => fireProgress(e, activeIdx, step.slug)}
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
              {STEPS.map((s, i) => {
                const hasFilm = !!videoFor(s.slug);
                return (
                  <button
                    key={s.slug}
                    className={`ria-thumb${i === activeIdx ? ' active' : ''}`}
                    role="tab"
                    aria-selected={i === activeIdx}
                    aria-label={`Play ${s.name}`}
                    onClick={() => selectStep(i)}
                  >
                    <img className="ria-thumb-img" src={posterFor(s.num)} alt={`${s.name}`} loading="lazy" />
                    {hasFilm && <span className="ria-thumb-cue">{PLAY_SM}</span>}
                    <span className="ria-thumb-meta">
                      <span className="ria-thumb-badges">
                        <span className="ria-num">{s.num}</span>
                        <span className={`ria-freq ${s.freq}`}>{s.freq}</span>
                      </span>
                      <span className="ria-thumb-name">{s.name}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="ria-more reveal">
          <a href="/ritual" onClick={() => capture('ritual_cta_clicked', { source: 'ritual_in_action' })}>
            See the full ritual {ARROW}
          </a>
        </div>
      </section>
    </>
  );
}
