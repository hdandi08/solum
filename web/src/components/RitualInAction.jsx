import { useEffect, useRef, useState, useCallback } from 'react';
import { capture } from '../lib/analytics.js';
import { markRitualProgress, markRitualEngaged } from '../lib/qualifiedVisitTracker.js';
import { PRODUCTS } from '../data/products.js';
import { videoFor } from '../data/productMedia.js';

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
.ria-section{background:var(--black);border-top:1px solid var(--line);padding:80px 0;overflow:hidden;}
.ria-head-wrap{max-width:760px;margin:0 auto 34px;padding:0 24px;}
.ria-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;text-align:center;margin-bottom:14px;}
.ria-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,6vw,64px);letter-spacing:.04em;color:var(--bone);line-height:.95;text-align:center;margin-bottom:12px;}
.ria-sub{font-size:15px;font-weight:300;color:var(--stone);text-align:center;margin:0 auto;max-width:480px;line-height:1.6;}

.ria-gallery{position:relative;}
.ria-carousel{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;
  padding:6px 11vw 8px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.ria-carousel::-webkit-scrollbar{display:none;}
.ria-card{flex:0 0 78vw;max-width:340px;scroll-snap-align:center;cursor:pointer;
  background:none;border:none;padding:0;text-align:left;color:inherit;}
.ria-card:focus-visible{outline:2px solid var(--blit);outline-offset:3px;}
.ria-card-media{position:relative;width:100%;height:62vh;max-height:560px;overflow:hidden;background:#000;
  border:1px solid var(--line);transition:border-color .3s;}
.ria-card.active .ria-card-media{border-color:rgba(46,109,164,0.5);}
.ria-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.ria-scrim{position:absolute;inset:0;background:linear-gradient(to top,rgba(8,9,11,0.88),rgba(8,9,11,0.1) 52%,rgba(8,9,11,0) 72%);pointer-events:none;}
.ria-card-cue{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:54px;height:54px;border-radius:50%;
  background:rgba(46,109,164,0.6);border:1.5px solid var(--bone);display:flex;align-items:center;justify-content:center;color:var(--bone);pointer-events:none;}
.ria-stage-overlay{position:absolute;left:0;right:0;bottom:0;padding:16px;display:flex;flex-direction:column;gap:6px;pointer-events:none;}
.ria-badges{display:flex;align-items:center;gap:6px;}
.ria-num{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.08em;color:var(--bone);background:rgba(8,9,11,0.55);border:1px solid rgba(240,236,226,0.3);padding:2px 7px;}
.ria-freq{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;padding:2px 7px;border:1px solid;}
.ria-freq.daily{color:var(--blit);border-color:rgba(46,109,164,0.45);background:rgba(46,109,164,0.12);}
.ria-freq.weekly{color:#c8a96e;border-color:rgba(200,169,110,0.45);background:rgba(200,169,110,0.12);}
.ria-stage-name{font-family:'Bebas Neue',sans-serif;font-size:23px;letter-spacing:.04em;color:var(--bone);line-height:1.05;}
.ria-stage-action{font-size:14px;font-weight:300;color:var(--mist);line-height:1.45;}

.ria-arrow{display:none;}

.ria-dots{display:flex;justify-content:center;align-items:center;gap:8px;margin-top:20px;padding:0 24px;flex-wrap:wrap;}
.ria-dot{width:7px;height:7px;border-radius:50%;background:rgba(240,236,226,0.22);border:none;padding:0;cursor:pointer;transition:background .25s,width .25s;}
.ria-dot.active{background:var(--blit);width:20px;border-radius:4px;}

.ria-more{display:flex;justify-content:center;margin-top:26px;}
.ria-more a{display:inline-flex;align-items:center;gap:8px;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;color:var(--bone);text-decoration:none;padding:12px 28px;border:1px solid rgba(240,236,226,0.25);transition:border-color .2s;}
.ria-more a:hover{border-color:var(--bone);}

/* Desktop: coverflow — cap the media height so video + dots fit one screen,
   dim/shrink off-centre cards, show arrows. */
@media(min-width:769px){
  .ria-section{padding:48px 0;}
  .ria-carousel{gap:22px;padding:6px calc(50% - 150px) 10px;}
  .ria-card{flex-basis:auto;max-width:none;}
  .ria-card-media{height:clamp(360px,56vh,520px);width:auto;aspect-ratio:9/16;
    transition:border-color .3s,transform .35s ease,opacity .35s ease;transform:scale(.82);opacity:.5;}
  .ria-card.active .ria-card-media{transform:scale(1);opacity:1;}
  .ria-arrow{display:flex;align-items:center;justify-content:center;position:absolute;top:calc(50% - 8px);
    transform:translateY(-50%);width:48px;height:48px;border-radius:50%;background:rgba(18,21,28,0.92);
    border:1px solid rgba(240,236,226,0.3);color:var(--bone);cursor:pointer;z-index:2;box-shadow:0 4px 18px rgba(0,0,0,0.45);transition:background .2s,border-color .2s;}
  .ria-arrow:hover{background:var(--char);border-color:var(--blit);}
  .ria-arrow.prev{left:calc(50% - 220px);} .ria-arrow.next{right:calc(50% - 220px);}
}
@media(max-width:768px){ .ria-section{padding:60px 0;} }
`;

const PLAY = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);
const ARROW = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7h10M8 3l4 4-4 4" /></svg>
);
const chevron = (dir) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
);

export default function RitualInAction() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [userSelected, setUserSelected] = useState(false);

  const carouselRef = useRef(null);
  const cardRefs = useRef([]);
  const vidRefs = useRef([]);
  const firstSettle = useRef(true);
  const progressFired = useRef(new Set());
  const rafId = useRef(0);
  const sectionRef = useRef(null);
  const activeIdxRef = useRef(0);
  const inView = useRef(false);
  const settleTimer = useRef(0);

  // Play the SETTLED card (only while the section is on screen); pause the rest.
  // The first settle on load is passive (no intent); later settles are deliberate.
  const settle = useCallback((i) => {
    activeIdxRef.current = i;
    progressFired.current = new Set();
    vidRefs.current.forEach((v, idx) => {
      if (!v) return;
      if (idx === i && !REDUCE_MOTION && inView.current) { v.play().catch(() => {}); } else { v.pause(); }
    });
    if (firstSettle.current) { firstSettle.current = false; return; }
    setUserSelected(true);
    capture('ritual_selected', { product: STEPS[i].slug, source: 'ritual_in_action' });
    markRitualEngaged(STEPS[i].slug);
  }, []);

  // Nearest-centre card is active (visual, live). Playback + selection fire only
  // once scroll SETTLES, so flicking past cards never emits intent for each one.
  useEffect(() => {
    const car = carouselRef.current;
    if (!car) return;
    const SETTLE_MS = 140;
    const measure = () => {
      const cx = car.scrollLeft + car.clientWidth / 2;
      let best = 0, bd = Infinity;
      cardRefs.current.forEach((el, idx) => {
        if (!el) return;
        const c = el.offsetLeft + el.offsetWidth / 2;
        const d = Math.abs(c - cx);
        if (d < bd) { bd = d; best = idx; }
      });
      if (best !== activeIdxRef.current) { activeIdxRef.current = best; setActiveIdx(best); }
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => settle(best), SETTLE_MS);
    };
    const onScroll = () => { cancelAnimationFrame(rafId.current); rafId.current = requestAnimationFrame(measure); };
    measure(); // schedules the first (passive) settle on card 0
    car.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      car.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId.current);
      clearTimeout(settleTimer.current);
    };
  }, [settle]);

  // Only play while the gallery is on screen (restores the previous in-view gate).
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        inView.current = e.isIntersecting;
        const v = vidRefs.current[activeIdxRef.current];
        if (!v) return;
        if (e.isIntersecting && !REDUCE_MOTION) { v.play().catch(() => {}); } else { v.pause(); }
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const goTo = (i) => {
    const idx = Math.max(0, Math.min(STEPS.length - 1, i));
    cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  // Clicking an already-centred card fires no scroll event, so the scroll-based
  // detector never re-runs. Register the deliberate selection directly in that case.
  const promote = useCallback((i) => {
    activeIdxRef.current = i;
    progressFired.current = new Set();
    const v = vidRefs.current[i];
    if (v && !REDUCE_MOTION && inView.current) { try { v.currentTime = 0; v.play().catch(() => {}); } catch { /* ignore */ } }
    firstSettle.current = false;
    setUserSelected(true);
    capture('ritual_selected', { product: STEPS[i].slug, source: 'ritual_in_action' });
    markRitualEngaged(STEPS[i].slug);
  }, []);

  const onCardActivate = (i) => {
    if (i === activeIdx) { promote(i); } else { goTo(i); }
  };

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
      <section className="ria-section" id="ritual" ref={sectionRef}>
        <div className="ria-head-wrap">
          <div className="ria-eyebrow reveal">The Ritual</div>
          <h2 className="ria-head reveal">Ritual in Action.</h2>
          <p className="ria-sub reveal">Every step, on real skin. Daily keeps you maintained. Weekly resets you.</p>
        </div>

        <div className="ria-gallery reveal">
          <button className="ria-arrow prev" aria-label="Previous step" onClick={() => goTo(activeIdx - 1)}>{chevron('prev')}</button>

          <div className="ria-carousel" ref={carouselRef} role="group" aria-label="Ritual steps">
            {STEPS.map((s, i) => {
              const f = videoFor(s.slug);
              const vid = !!f && !REDUCE_MOTION;
              const pos = (f && f.poster) || posterFor(s.num);
              return (
                <div
                  className={`ria-card${i === activeIdx ? ' active' : ''}`}
                  key={s.slug}
                  data-idx={i}
                  role="button"
                  tabIndex={0}
                  aria-label={`Play ${s.name}`}
                  ref={(el) => { cardRefs.current[i] = el; }}
                  onClick={() => onCardActivate(i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardActivate(i); } }}
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

          <button className="ria-arrow next" aria-label="Next step" onClick={() => goTo(activeIdx + 1)}>{chevron('next')}</button>
        </div>

        <div className="ria-dots" role="tablist" aria-label="Ritual steps">
          {STEPS.map((s, i) => (
            <button
              key={s.slug}
              className={`ria-dot${i === activeIdx ? ' active' : ''}`}
              aria-label={`Go to ${s.name}`}
              aria-selected={i === activeIdx}
              onClick={() => goTo(i)}
            />
          ))}
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
