import { useState, useRef } from 'react';
import { capture } from '../../lib/analytics.js';
import { markRitualProgress } from '../../lib/qualifiedVisitTracker.js';
import { DAILY_VIDEO, DAILY_POSTER, WEEKLY_READY, RITUALS, GOLD } from '../../data/ritualVideo.js';

const CSS = `
/* ── Section shell ─────────────────────────────── */
.rv-section{background:var(--black);border-top:1px solid var(--line);padding:80px 24px;}
.rv-inner{max-width:1100px;margin:0 auto;}
.rv-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;text-align:center;margin-bottom:14px;}
.rv-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,6vw,64px);letter-spacing:.04em;color:var(--bone);line-height:.95;text-align:center;margin-bottom:12px;}
.rv-sub{font-size:15px;font-weight:300;color:var(--stone);text-align:center;margin:0 auto 48px;max-width:480px;line-height:1.6;}

/* ── Layout (mobile-first) ─────────────────────── */
.rv-layout{display:flex;flex-direction:column;gap:18px;}

/* ── Pills ─────────────────────────────────────── */
.rv-pills{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.rv-join{display:none;}
.rv-pill{position:relative;text-align:left;width:100%;background:var(--char);border:1px solid var(--line);border-top:2px solid transparent;padding:18px 18px;cursor:pointer;transition:opacity .25s,background .25s,border-color .25s;}
.rv-pill:hover{background:var(--mid);}
.rv-pill.dim{opacity:.78;}
.rv-pill.sel.daily{border-top-color:var(--blue);background:rgba(46,109,164,0.08);}
.rv-pill.sel.weekly{border-top-color:${GOLD};background:rgba(200,169,110,0.07);}
.rv-pill-freq{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;margin-bottom:8px;}
.rv-pill.sel.daily .rv-pill-freq{color:var(--blit);}
.rv-pill.sel.weekly .rv-pill-freq{color:${GOLD};}
.rv-pill-title{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:6px;}
.rv-pill-time{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--stone);}
.rv-pill-copy{display:none;font-size:13px;font-weight:300;color:var(--mist);line-height:1.5;margin-top:13px;}
.rv-pill-hint{display:inline-flex;align-items:center;gap:6px;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-top:14px;}
.rv-pill.daily .rv-pill-hint{color:var(--blit);}
.rv-pill.weekly .rv-pill-hint{color:${GOLD};}

/* selection arrow — points down (mobile) into the stage below */
.rv-arrow{position:absolute;left:50%;bottom:-15px;transform:translateX(-50%) rotate(90deg);line-height:0;}
.rv-pill.daily .rv-arrow{color:var(--blue);}
.rv-pill.weekly .rv-arrow{color:${GOLD};}

/* ── Stage (video / coming-soon) ───────────────── */
.rv-stage{position:relative;aspect-ratio:9/16;max-width:380px;margin:0 auto;width:100%;overflow:hidden;background:#000;border:1px solid var(--line);transition:box-shadow .3s,border-color .3s;}
.rv-stage.daily{border-color:rgba(46,109,164,0.5);box-shadow:0 0 0 1px rgba(46,109,164,0.25),0 18px 50px -20px rgba(46,109,164,0.45);}
.rv-stage.weekly{border-color:rgba(200,169,110,0.45);box-shadow:0 0 0 1px rgba(200,169,110,0.22),0 18px 50px -20px rgba(200,169,110,0.4);}
.rv-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;background:#000;}

.rv-poster{position:absolute;inset:0;width:100%;height:100%;border:none;padding:0;cursor:pointer;background:#000;display:block;}
.rv-poster-img{position:absolute;inset:0;background-size:cover;background-position:center;}
.rv-pi-d{background-image:url(${DAILY_POSTER.desktop});display:none;}
.rv-pi-m{background-image:url(${DAILY_POSTER.mobile});}
.rv-scrim{position:absolute;inset:0;background:linear-gradient(to top,rgba(8,9,11,0.55),rgba(8,9,11,0) 38%,rgba(8,9,11,0) 70%,rgba(8,9,11,0.45));}
.rv-play{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:62px;height:62px;border-radius:50%;background:rgba(8,9,11,0.55);border:1.5px solid var(--bone);display:flex;align-items:center;justify-content:center;color:var(--bone);backdrop-filter:blur(3px);transition:transform .2s,background .2s;}
.rv-poster:hover .rv-play{transform:translate(-50%,-50%) scale(1.08);background:var(--blue);border-color:var(--blue);}
.rv-dur{position:absolute;bottom:12px;right:12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;background:rgba(8,9,11,0.5);padding:4px 8px;}
.rv-vlabel{position:absolute;top:12px;left:12px;display:inline-flex;align-items:center;gap:7px;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;color:var(--blit);background:rgba(8,9,11,0.5);padding:5px 10px;pointer-events:none;}

/* coming-soon (weekly) */
.rv-soon{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;padding:32px;background:radial-gradient(circle at 50% 35%,rgba(200,169,110,0.12),rgba(8,9,11,0.96));}
.rv-soon-badge{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};font-weight:600;border:1px solid rgba(200,169,110,0.45);padding:7px 14px;}
.rv-soon-h{font-family:'Bebas Neue',sans-serif;font-size:38px;letter-spacing:.04em;color:var(--bone);line-height:1;}

/* end-of-video cross-promo */
.rv-end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:28px;background:rgba(8,9,11,0.84);backdrop-filter:blur(2px);animation:rvfade .45s ease both;}
.rv-end-done{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.rv-end-next{display:inline-flex;align-items:center;gap:11px;font-family:'Bebas Neue',sans-serif;font-size:clamp(20px,4.5vw,27px);letter-spacing:.05em;background:none;border:none;cursor:pointer;padding:0;line-height:1.05;}
.rv-end.to-weekly .rv-end-next{color:${GOLD};}
.rv-end.to-daily .rv-end-next{color:var(--blit);}
.rv-end-next .arw{display:inline-flex;animation:rvnudge 1.1s ease-in-out infinite;}
.rv-end-line{width:40px;height:2px;animation:rvgrow 1.5s ease-in-out infinite;transform-origin:center;}
.rv-end.to-weekly .rv-end-line{background:${GOLD};}
.rv-end.to-daily .rv-end-line{background:var(--blit);}
.rv-replay{display:inline-flex;align-items:center;gap:7px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);background:none;border:1px solid rgba(240,236,226,0.25);padding:9px 16px;cursor:pointer;transition:border-color .2s,color .2s;}
.rv-replay:hover{border-color:var(--bone);color:var(--bone);}
@keyframes rvfade{from{opacity:0;}to{opacity:1;}}
@keyframes rvnudge{0%,100%{transform:translateX(0);}50%{transform:translateX(7px);}}
@keyframes rvgrow{0%,100%{opacity:.5;transform:scaleX(.65);}50%{opacity:1;transform:scaleX(1);}}

/* ── Product rail ──────────────────────────────── */
.rv-rail{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:4px;}
.rv-rail.weekly{grid-template-columns:repeat(4,1fr);}
.rv-prod{display:flex;flex-direction:column;align-items:center;gap:6px;background:var(--char);border:1px solid var(--line);padding:12px 6px 10px;}
.rv-prod-img{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;}
.rv-prod-img img{max-width:100%;max-height:100%;object-fit:contain;}
.rv-prod-num{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.05em;color:var(--stone);}
.rv-rail.daily .rv-prod-num{color:var(--blit);}
.rv-rail.weekly .rv-prod-num{color:${GOLD};}
.rv-prod-name{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--stone);text-align:center;line-height:1.3;}

/* ── Desktop (≥769px): pills left, stage right ─── */
@media(min-width:769px){
  .rv-layout{display:grid;grid-template-columns:300px 1fr;gap:44px;align-items:center;}
  .rv-left{display:flex;flex-direction:column;}
  .rv-pills{grid-template-columns:1fr;gap:0;}
  .rv-join{display:block;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);text-align:center;padding:12px 0;}
  .rv-pill{padding:24px 24px;}
  .rv-pill-copy{display:block;}
  .rv-pill.dim .rv-pill-copy{display:none;}
  .rv-arrow{left:auto;bottom:auto;right:-22px;top:50%;transform:translateY(-50%) rotate(0deg);}
  .rv-stage{aspect-ratio:16/9;max-width:none;}
  .rv-pi-d{display:block;}
  .rv-pi-m{display:none;}
  .rv-right{display:flex;flex-direction:column;gap:16px;}
}

@media(max-width:768px){
  .rv-section{padding:60px 20px;}
}
`;

const CHEVRON = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4l6 6-6 6" />
  </svg>
);

const PLAY = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

function Pill({ id, active, onSelect }) {
  const r = RITUALS[id];
  const selected = active === id;
  return (
    <button
      type="button"
      className={`rv-pill ${id} ${selected ? 'sel' : 'dim'}`}
      onClick={() => onSelect(id)}
      aria-pressed={selected}
    >
      <div className="rv-pill-freq">{r.freq}</div>
      <div className="rv-pill-title">{r.title}</div>
      <div className="rv-pill-time">{r.time}</div>
      <p className="rv-pill-copy">{r.copy}</p>
      <span className="rv-pill-hint">
        {id === 'daily' ? `▶ ${r.duration} film` : (WEEKLY_READY ? '▶ Watch the film' : '◇ Film coming soon')}
      </span>
      {selected && <span className="rv-arrow">{CHEVRON}</span>}
    </button>
  );
}

export default function RitualVideoSelector({ eyebrow = 'The Ritual System', heading = 'The Ritual.', sub = 'Daily every shower. Weekly once a week. Both matter.' }) {
  const [active, setActive] = useState('daily');
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const videoRef = useRef(null);
  const progressFired = useRef(new Set());
  const other = active === 'daily' ? 'weekly' : 'daily';

  const select = (id) => {
    if (id === active) return;
    if (videoRef.current) videoRef.current.pause();
    setPlaying(false);
    setEnded(false);
    setActive(id);
    progressFired.current.clear();
    capture('ritual_selected', { ritual: id, source: 'ritual_page' });
  };

  function onTimeUpdate(e) {
    const v = e.currentTarget;
    if (!v.duration) return;
    const pct = Math.round((v.currentTime / v.duration) * 100);
    for (const m of [25, 50, 75, 100]) {
      if (pct >= m && !progressFired.current.has(m)) {
        progressFired.current.add(m);
        capture('ritual_video_progress', { ritual: active, percent: m, source: 'ritual_page' });
        markRitualProgress(m);
      }
    }
  }

  const play = () => {
    const v = videoRef.current;
    if (!v) return;
    setEnded(false);
    v.play();
    setPlaying(true);
    capture('ritual_video_played', { ritual: active, source: 'ritual_page' });
  };

  const replay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setEnded(false);
    v.play();
    setPlaying(true);
  };

  const ritual = RITUALS[active];
  const showVideo = active === 'daily' || WEEKLY_READY;

  return (
    <>
      <style>{CSS}</style>
      <section className="rv-section" id="ritual-system">
        <div className="rv-inner">
          <div className="rv-eyebrow">{eyebrow}</div>
          <h2 className="rv-head">{heading}</h2>
          <p className="rv-sub">{sub}</p>

          <div className="rv-layout">
            <div className="rv-left">
              <div className="rv-pills">
                <Pill id="daily" active={active} onSelect={select} />
                <div className="rv-join">+ once a week</div>
                <Pill id="weekly" active={active} onSelect={select} />
              </div>
            </div>

            <div className="rv-right">
              <div className={`rv-stage ${active}`}>
                {showVideo ? (
                  <>
                    <video
                      ref={videoRef}
                      className="rv-video"
                      poster={DAILY_POSTER.desktop}
                      controls={playing}
                      preload="metadata"
                      playsInline
                      onTimeUpdate={onTimeUpdate}
                      onEnded={() => { setPlaying(false); setEnded(true); }}
                    >
                      <source src={DAILY_VIDEO.mobile} media="(max-width:768px)" />
                      <source src={DAILY_VIDEO.desktop} />
                    </video>
                    {!playing && !ended && (
                      <button className="rv-poster" onClick={play} aria-label="Play the daily ritual film">
                        <span className="rv-poster-img rv-pi-d" />
                        <span className="rv-poster-img rv-pi-m" />
                        <span className="rv-scrim" />
                        <span className="rv-play">{PLAY}</span>
                        {ritual.duration && <span className="rv-dur">{ritual.duration}</span>}
                        <span className="rv-vlabel">● {ritual.title}</span>
                      </button>
                    )}
                    {ended && (
                      <div className={`rv-end to-${other}`}>
                        <span className="rv-end-done">{ritual.title} · Complete</span>
                        <button className="rv-end-next" onClick={() => select(other)}>
                          Now watch the {other === 'weekly' ? 'Weekly' : 'Daily'} Ritual
                          <span className="arw">{CHEVRON}</span>
                        </button>
                        <span className="rv-end-line" />
                        <button className="rv-replay" onClick={replay}>↻ Replay</button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rv-soon">
                    <span className="rv-soon-badge">◇ Film coming soon</span>
                    <span className="rv-soon-h">Weekly Ritual</span>
                  </div>
                )}
              </div>

              <div className={`rv-rail ${active}`}>
                {ritual.products.map((p) => (
                  <div key={p.num + p.name} className="rv-prod">
                    <span className="rv-prod-img"><img src={p.img} alt={p.name} loading="lazy" /></span>
                    <span className="rv-prod-num">{p.num}</span>
                    <span className="rv-prod-name">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
