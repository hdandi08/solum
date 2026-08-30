import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { capture } from '../lib/analytics.js';
import { markRitualProgress, markRitualEngaged } from '../lib/qualifiedVisitTracker.js';
import { PRODUCTS } from '../data/products.js';
import { videoFor } from '../data/productMedia.js';

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MEDIA_PRELOAD_MARGIN = '600px 0px';
const CAROUSEL_MEDIA_MARGIN = '0px 160px';

const STEPS = [
  { num: '04', slug: '04-scalp-massager', ritual: 'daily', freq: 'daily', name: 'Scalp Massager', action: 'Less buildup and a fresher root feel.' },
  { num: '01', slug: '01-body-wash', ritual: 'daily', freq: 'daily', name: 'Body Wash', action: 'Clean skin without the tight, stripped feeling.' },
  { num: '03', slug: '03-back-scrub-cloth', ritual: 'daily', freq: 'daily', name: 'Back Scrub Cloth', action: 'The back finally feels as clean as the front.' },
  { num: '08', slug: '08-cleansing-cloth', ritual: 'daily', freq: 'daily', name: 'Intimate Cleansing Cloth', action: 'Gentle confidence where skin is easiest to irritate.' },
  { num: '07', slug: '07-body-lotion', ritual: 'daily', freq: 'daily', name: 'Body Lotion', action: 'Comfort that lasts beyond the towel.' },
  { num: '05', slug: '05-atlas-clay', ritual: 'weekly', freq: 'weekly', name: 'Atlas Clay Mask', action: 'Mix clay with argan oil so the weekly reset starts fed, not dry.' },
  { num: '04', slug: '04-scalp-massager', ritual: 'weekly', freq: 'weekly', name: 'Scalp Massager', action: 'More time at the roots so the scalp feels properly reset.' },
  { num: '02', slug: '02-italy-towel-mitt', ritual: 'weekly', freq: 'weekly', name: 'Italy Towel Mitt', action: 'Roughness lifts while skin is warm and ready.' },
  { num: '06', slug: '06-argan-oil', ritual: 'weekly', freq: 'weekly', name: 'Argan Body Oil', action: 'Seals the weekly reset so skin feels fed, not dry.' },
];

const RITUALS = [
  {
    key: 'daily',
    blockClass: 'ria-ritual-block daily',
    title: 'Daily Ritual',
    cadence: 'Every shower · 10 minutes',
    summary: 'Maintenance for the shower you already take.',
    promise: 'Root freshness, reached-back clean and a comfortable finish.',
    steps: [
      { num: '04', name: 'Scalp Massager', outcome: 'Wake up the scalp first.' },
      { num: '01', name: 'Body Wash', outcome: 'Clean without the tight feeling.' },
      { num: '03', name: 'Back Scrub Cloth', outcome: 'Reach what hands miss.' },
      { num: '08', name: 'Cleansing Cloth', outcome: 'Handle delicate zones calmly.' },
      { num: '07', name: 'Body Lotion', outcome: 'Finish within the 3-minute window.' },
    ],
  },
  {
    key: 'weekly',
    blockClass: 'ria-ritual-block weekly',
    title: 'Weekly Deep Reset',
    cadence: 'Once a week · 22 minutes',
    summary: 'Clay mix, scalp, full-body reset, oil finish.',
    promise: 'Argan oil keeps skin fed, not dry, so the reset feels complete.',
    steps: [
      { num: '05 + 06', name: 'Atlas Clay Mask + Argan Body Oil', outcome: 'Mix, apply, let the surface soften.' },
      { num: '04', name: 'Scalp Massager', outcome: 'Spend longer at the roots.' },
      { num: '02', name: 'Italy Towel Mitt', outcome: 'Lift roughness while skin is warm.' },
      { num: '06', name: 'Argan Body Oil', outcome: 'Press into damp skin so the reset ends fed.' },
    ],
  },
];

function posterFor(num) {
  const prod = PRODUCTS.find((p) => p.num === num);
  return prod?.media?.gallery?.[0] || prod?.media?.still || '';
}

const CSS = `
.ria-section{background:var(--black);border-top:1px solid var(--line);padding:80px 0;overflow:hidden;}
.ria-head-wrap{max-width:760px;margin:0 auto 38px;padding:0 24px;}
.ria-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;text-align:center;margin-bottom:14px;}
.ria-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,6vw,64px);letter-spacing:.04em;color:var(--bone);line-height:.95;text-align:center;margin-bottom:12px;}
.ria-sub{font-size:15px;font-weight:300;color:var(--stone);text-align:center;margin:0 auto;max-width:480px;line-height:1.6;}

.ria-ritual-stack{display:grid;gap:58px;}
.ria-ritual-block{display:grid;gap:24px;}
.ria-ritual-overview{max-width:1120px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:minmax(0,.82fr) minmax(0,1.18fr);gap:18px;align-items:stretch;}
.ria-ritual-card{border:1px solid rgba(240,236,226,.14);background:linear-gradient(135deg,rgba(24,28,36,.62),rgba(8,9,11,.78));padding:24px;position:relative;overflow:hidden;}
.ria-ritual-card::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(74,143,199,.16),rgba(8,9,11,0) 48%);opacity:.5;pointer-events:none;}
.ria-ritual-block.weekly .ria-ritual-card{background:linear-gradient(135deg,rgba(24,28,36,.64),rgba(8,9,11,.82));border-color:rgba(200,169,110,.28);}
.ria-ritual-block.weekly .ria-ritual-card::before{background:linear-gradient(135deg,rgba(200,169,110,.15),rgba(8,9,11,0) 52%);}
.ria-ritual-top{position:relative;display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:18px;}
.ria-ritual-title{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:.06em;color:var(--bone);line-height:1;}
.ria-ritual-cadence{font-size:11px;letter-spacing:2.4px;text-transform:uppercase;color:var(--blit);font-weight:700;text-align:right;white-space:nowrap;}
.ria-ritual-block.weekly .ria-ritual-cadence{color:#c8a96e;}
.ria-ritual-summary{position:relative;margin:0 0 14px;color:rgba(240,236,226,.72);font-size:15px;line-height:1.45;font-weight:300;}
.ria-ritual-promise{position:relative;margin:0;color:var(--bone);font-size:16px;line-height:1.45;}
.ria-ritual-sequence{list-style:none;margin:0;padding:0;border:1px solid rgba(240,236,226,.12);background:rgba(8,9,11,.32);}
.ria-ritual-step{display:grid;grid-template-columns:auto minmax(0,.72fr) minmax(0,1fr);gap:12px;align-items:center;padding:12px 14px;border-top:1px solid rgba(240,236,226,.1);}
.ria-ritual-step:first-child{border-top:none;}
.ria-step-num{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.09em;color:var(--bone);border:1px solid rgba(240,236,226,.26);padding:2px 7px;background:rgba(8,9,11,.38);white-space:nowrap;}
.ria-step-name{font-size:14px;color:var(--bone);font-weight:600;letter-spacing:.02em;}
.ria-step-outcome{font-size:13px;color:rgba(240,236,226,.64);font-weight:300;line-height:1.35;}

.ria-gallery{position:relative;}
.ria-carousel{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;
  padding:6px 11vw 8px;-webkit-overflow-scrolling:touch;scrollbar-width:none;cursor:grab;}
.ria-carousel::-webkit-scrollbar{display:none;}
.ria-carousel.dragging{cursor:grabbing;scroll-snap-type:none;user-select:none;}
.ria-carousel img,.ria-carousel video{-webkit-user-drag:none;}
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

@media(min-width:769px){
  .ria-section{padding:58px 0;}
  .ria-carousel{gap:22px;padding:6px calc(50% - 150px) 10px;}
  .ria-card{flex-basis:auto;max-width:none;}
  .ria-card-media{height:clamp(360px,56vh,520px);width:auto;aspect-ratio:9/16;
    transition:border-color .3s,transform .35s ease,opacity .35s ease;transform:scale(.84);opacity:.58;}
  .ria-card.active .ria-card-media{transform:scale(1);opacity:1;}
  .ria-arrow{display:flex;align-items:center;justify-content:center;position:absolute;top:calc(50% - 8px);
    transform:translateY(-50%);width:48px;height:48px;border-radius:50%;background:var(--blue);
    border:1px solid var(--blit);color:var(--bone);cursor:pointer;z-index:2;box-shadow:0 6px 20px rgba(46,109,164,0.45);transition:background .2s,transform .2s;}
  .ria-arrow:hover{background:var(--blit);transform:translateY(-50%) scale(1.06);}
  .ria-arrow.prev{left:16px;} .ria-arrow.next{right:16px;}
}
@media(max-width:768px){
  .ria-section{padding:60px 0;}
  .ria-head-wrap{margin-bottom:24px;}
  .ria-ritual-stack{gap:48px;}
  .ria-ritual-overview{grid-template-columns:1fr;gap:12px;}
  .ria-ritual-card{padding:18px;}
  .ria-ritual-top{flex-direction:column;gap:8px;margin-bottom:14px;}
  .ria-ritual-cadence{text-align:left;white-space:normal;}
  .ria-ritual-step{grid-template-columns:auto 1fr;align-items:start;}
  .ria-step-outcome{grid-column:2;}
}
`;

const PLAY = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);
const chevron = (dir) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
);

function RitualRail({ ritual }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [userSelected, setUserSelected] = useState(false);
  const [mediaActivated, setMediaActivated] = useState(false);
  const [loadedMedia, setLoadedMedia] = useState(() => new Set());
  const visibleSteps = useMemo(() => STEPS.filter((step) => step.ritual === ritual.key), [ritual.key]);

  const railRef = useRef(null);
  const carouselRef = useRef(null);
  const cardRefs = useRef([]);
  const vidRefs = useRef([]);
  const firstSettle = useRef(true);
  const progressFired = useRef(new Set());
  const engagedFired = useRef(new Set());
  const rafId = useRef(0);
  const activeIdxRef = useRef(0);
  const inView = useRef(false);
  const mediaActivatedRef = useRef(false);
  const settleTimer = useRef(0);
  const draggedRef = useRef(false);

  const loadMedia = useCallback((idx) => {
    setLoadedMedia((previous) => (
      previous.has(idx) ? previous : new Set(previous).add(idx)
    ));
  }, []);

  const settle = useCallback((i) => {
    const step = visibleSteps[i];
    if (!step) return;
    activeIdxRef.current = i;
    if (mediaActivatedRef.current) loadMedia(i);
    progressFired.current = new Set();
    vidRefs.current.forEach((v, idx) => {
      if (!v) return;
      if (idx === i && !REDUCE_MOTION && inView.current) { v.play().catch(() => {}); } else { v.pause(); }
    });
    if (firstSettle.current) { firstSettle.current = false; return; }
    setUserSelected(true);
    capture('ritual_selected', { product: step.slug, ritual: ritual.key, source: 'ritual_in_action' });
  }, [loadMedia, ritual.key, visibleSteps]);

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
    measure();
    car.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      car.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId.current);
      clearTimeout(settleTimer.current);
    };
  }, [settle]);

  useEffect(() => {
    const el = railRef.current;
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

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setMediaActivated(true);
        io.disconnect();
      }
    }, { rootMargin: MEDIA_PRELOAD_MARGIN, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!mediaActivated) return;
    mediaActivatedRef.current = true;
    loadMedia(activeIdxRef.current);
  }, [mediaActivated, loadMedia]);

  useEffect(() => {
    if (!mediaActivated) return;
    const car = carouselRef.current;
    if (!car) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) loadMedia(Number(entry.target.dataset.idx));
      });
    }, { root: car, rootMargin: CAROUSEL_MEDIA_MARGIN, threshold: 0 });
    cardRefs.current.forEach((card) => { if (card) io.observe(card); });
    return () => io.disconnect();
  }, [mediaActivated, loadMedia]);

  useEffect(() => {
    if (!mediaActivated || REDUCE_MOTION || !inView.current) return;
    vidRefs.current[activeIdxRef.current]?.play().catch(() => {});
  }, [mediaActivated, loadedMedia]);

  useEffect(() => {
    const car = carouselRef.current;
    if (!car) return;
    let down = false, startX = 0, startScroll = 0;
    const onDown = (e) => {
      if (e.button !== 0) return;
      down = true; draggedRef.current = false;
      startX = e.pageX; startScroll = car.scrollLeft;
      car.classList.add('dragging');
    };
    const onMove = (e) => {
      if (!down) return;
      e.preventDefault();
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 4) draggedRef.current = true;
      car.scrollLeft = startScroll - dx;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      car.classList.remove('dragging');
    };
    car.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      car.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const goTo = (i) => {
    const idx = Math.max(0, Math.min(visibleSteps.length - 1, i));
    if (mediaActivatedRef.current) loadMedia(idx);
    cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const promote = useCallback((i) => {
    const step = visibleSteps[i];
    if (!step) return;
    activeIdxRef.current = i;
    if (mediaActivatedRef.current) loadMedia(i);
    progressFired.current = new Set();
    const v = vidRefs.current[i];
    if (v && !REDUCE_MOTION && inView.current) { try { v.currentTime = 0; v.play().catch(() => {}); } catch { /* ignore */ } }
    firstSettle.current = false;
    setUserSelected(true);
    capture('ritual_selected', { product: step.slug, ritual: ritual.key, source: 'ritual_in_action' });
  }, [loadMedia, ritual.key, visibleSteps]);

  const onCardActivate = (i) => {
    if (draggedRef.current) { draggedRef.current = false; return; }
    if (i === activeIdx) { promote(i); } else { goTo(i); }
  };

  function fireProgress(e, idx, slug) {
    if (!userSelected || idx !== activeIdx) return;
    const v = e.currentTarget;
    if (!v.duration) return;
    if (v.currentTime >= 3 && !engagedFired.current.has(slug)) {
      engagedFired.current.add(slug);
      markRitualEngaged(slug);
    }
    const pct = Math.round((v.currentTime / v.duration) * 100);
    for (const m of [25, 50, 75, 100]) {
      if (pct >= m && !progressFired.current.has(m)) {
        progressFired.current.add(m);
        capture('ritual_video_progress', { product: slug, ritual: ritual.key, percent: m, source: 'ritual_in_action' });
        markRitualProgress(m);
      }
    }
  }

  return (
    <article className={ritual.blockClass} ref={railRef}>
      <div className="ria-ritual-overview reveal">
        <div className="ria-ritual-card">
          <div className="ria-ritual-top">
            <h3 className="ria-ritual-title">{ritual.title}</h3>
            <span className="ria-ritual-cadence">{ritual.cadence}</span>
          </div>
          <p className="ria-ritual-summary">{ritual.summary}</p>
          <p className="ria-ritual-promise">{ritual.promise}</p>
        </div>
        <ol className="ria-ritual-sequence">
          {ritual.steps.map((step) => (
            <li className="ria-ritual-step" key={`${step.num}-${step.name}`}>
              <span className="ria-step-num">{step.num}</span>
              <span className="ria-step-name">{step.name}</span>
              <span className="ria-step-outcome">{step.outcome}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="ria-gallery reveal">
        <button className="ria-arrow prev" aria-label={`Previous ${ritual.title} step`} onClick={() => goTo(activeIdx - 1)}>{chevron('prev')}</button>

        <div className="ria-carousel" ref={carouselRef} role="group" aria-label={`${ritual.title} videos`}>
          {visibleSteps.map((step, i) => {
            const f = videoFor(step.slug);
            const vid = !!f && !REDUCE_MOTION;
            const pos = (f && f.poster) || posterFor(step.num);
            const mediaReady = mediaActivated && loadedMedia.has(i);
            return (
              <div
                className={`ria-card${i === activeIdx ? ' active' : ''}`}
                key={`${step.ritual}-${step.slug}`}
                data-idx={i}
                role="button"
                tabIndex={0}
                aria-label={`Play ${step.name}`}
                ref={(el) => { cardRefs.current[i] = el; }}
                onClick={() => onCardActivate(i)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardActivate(i); } }}
              >
                <div className="ria-card-media">
                  {mediaReady && vid ? (
                    <video
                      ref={(el) => { vidRefs.current[i] = el; }}
                      className="ria-media"
                      poster={pos}
                      muted
                      loop
                      playsInline
                      preload="none"
                      onTimeUpdate={(e) => fireProgress(e, i, step.slug)}
                    >
                      <source src={f.webm} type="video/webm" />
                      <source src={f.mp4} type="video/mp4" />
                    </video>
                  ) : mediaReady ? (
                    <img className="ria-media" src={pos} alt={`${step.name} in use`} loading="lazy" />
                  ) : (
                    <div className="ria-media" aria-hidden="true" />
                  )}
                  <div className="ria-scrim" />
                  {vid && i !== activeIdx && <span className="ria-card-cue">{PLAY}</span>}
                  <div className="ria-stage-overlay">
                    <div className="ria-badges">
                      <span className="ria-num">{step.num}</span>
                      <span className={`ria-freq ${step.freq}`}>{step.freq}</span>
                    </div>
                    <span className="ria-stage-name">{step.name}</span>
                    <span className="ria-stage-action">{step.action}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button className="ria-arrow next" aria-label={`Next ${ritual.title} step`} onClick={() => goTo(activeIdx + 1)}>{chevron('next')}</button>
      </div>

      <div className="ria-dots" role="tablist" aria-label={`${ritual.title} steps`}>
        {visibleSteps.map((step, i) => (
          <button
            key={`${step.ritual}-${step.slug}`}
            className={`ria-dot${i === activeIdx ? ' active' : ''}`}
            aria-label={`Go to ${step.name}`}
            aria-selected={i === activeIdx}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </article>
  );
}

export default function RitualInAction() {
  return (
    <>
      <style>{CSS}</style>
      <section className="ria-section" id="ritual">
        <div className="ria-head-wrap">
          <div className="ria-eyebrow reveal">Daily and weekly</div>
          <h2 className="ria-head reveal">See the ritual before the products.</h2>
          <p className="ria-sub reveal">First see the method. Then the product list makes sense.</p>
        </div>

        <div className="ria-ritual-stack">
          {RITUALS.map((ritual) => <RitualRail key={ritual.key} ritual={ritual} />)}
        </div>
      </section>
    </>
  );
}
