import { useState, useRef } from 'react';
import { capture } from '../lib/analytics.js';
import { DAILY_VIDEO, DAILY_POSTER, WEEKLY_READY, RITUALS, GOLD } from '../data/ritualVideo.js';

const CSS = `
.rt-section{background:var(--black);border-top:1px solid var(--line);padding:80px 24px;}
.rt-inner{max-width:760px;margin:0 auto;}
.rt-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;text-align:center;margin-bottom:14px;}
.rt-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,6vw,64px);letter-spacing:.04em;color:var(--bone);line-height:.95;text-align:center;margin-bottom:12px;}
.rt-sub{font-size:15px;font-weight:300;color:var(--stone);text-align:center;margin:0 auto 28px;max-width:480px;line-height:1.6;}

/* ── Daily / Weekly toggle ─────────────────────── */
.rt-toggle{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:24px;}
.rt-tab{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:172px;background:var(--char);border:1px solid var(--line);border-top:2px solid transparent;padding:13px 18px;cursor:pointer;text-align:left;transition:background .2s,border-color .2s,opacity .2s;}
.rt-tab:hover{background:var(--mid);}
.rt-tab.dim{opacity:.5;}
.rt-tab.sel.daily{border-top-color:var(--blue);background:rgba(46,109,164,0.08);}
.rt-tab.sel.weekly{border-top-color:${GOLD};background:rgba(200,169,110,0.07);}
.rt-tab-top{display:flex;align-items:center;gap:9px;}
.rt-tab-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.rt-tab.daily .rt-tab-dot{background:var(--blue);}
.rt-tab.weekly .rt-tab-dot{background:${GOLD};}
.rt-tab-name{font-family:'Bebas Neue',sans-serif;font-size:19px;letter-spacing:.05em;color:var(--bone);line-height:1;}
.rt-tab-meta{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--stone);}
.rt-tab-hint{font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:var(--stone);}
.rt-tab.sel.daily .rt-tab-hint{color:var(--blit);}
.rt-tab.sel.weekly .rt-tab-hint{color:${GOLD};}

/* ── Stage / inline player ─────────────────────── */
.rt-stage{position:relative;width:100%;aspect-ratio:9/16;max-width:340px;margin:0 auto;overflow:hidden;background:#000;border:1px solid var(--line);transition:box-shadow .3s,border-color .3s;}
.rt-stage.daily{border-color:rgba(46,109,164,0.5);box-shadow:0 0 0 1px rgba(46,109,164,0.22),0 22px 60px -24px rgba(46,109,164,0.5);}
.rt-stage.weekly{border-color:rgba(200,169,110,0.45);box-shadow:0 0 0 1px rgba(200,169,110,0.2),0 22px 60px -24px rgba(200,169,110,0.42);}
.rt-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;background:#000;}
.rt-poster{position:absolute;inset:0;width:100%;height:100%;border:none;padding:0;cursor:pointer;background:#000;display:block;}
.rt-poster-img{position:absolute;inset:0;background-size:cover;background-position:center;}
.rt-pi-d{background-image:url(${DAILY_POSTER.desktop});display:none;}
.rt-pi-m{background-image:url(${DAILY_POSTER.mobile});}
.rt-scrim{position:absolute;inset:0;background:linear-gradient(to top,rgba(8,9,11,0.6),rgba(8,9,11,0) 40%,rgba(8,9,11,0) 68%,rgba(8,9,11,0.45));}
.rt-watch{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:14px;}
.rt-play{width:66px;height:66px;border-radius:50%;background:rgba(8,9,11,0.5);border:1.5px solid var(--bone);display:flex;align-items:center;justify-content:center;color:var(--bone);backdrop-filter:blur(3px);transition:transform .2s,background .2s,border-color .2s;}
.rt-poster:hover .rt-play{transform:scale(1.08);background:var(--blue);border-color:var(--blue);}
.rt-watch-label{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.12em;color:var(--bone);text-transform:uppercase;text-shadow:0 1px 8px rgba(8,9,11,0.8);}
.rt-dur{position:absolute;bottom:12px;right:12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;background:rgba(8,9,11,0.5);padding:4px 8px;}

/* weekly coming-soon */
.rt-soon{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;padding:32px;background:radial-gradient(circle at 50% 35%,rgba(200,169,110,0.12),rgba(8,9,11,0.96));}
.rt-soon-badge{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};font-weight:600;border:1px solid rgba(200,169,110,0.45);padding:7px 14px;}
.rt-soon-h{font-family:'Bebas Neue',sans-serif;font-size:34px;letter-spacing:.04em;color:var(--bone);line-height:1;}
.rt-soon-p{font-size:13px;font-weight:300;color:var(--stone);line-height:1.55;max-width:230px;}

/* end-of-video cross-promo */
.rt-end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:28px;background:rgba(8,9,11,0.84);backdrop-filter:blur(2px);animation:rtfade .45s ease both;}
.rt-end-done{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.rt-end-next{display:inline-flex;align-items:center;gap:11px;font-family:'Bebas Neue',sans-serif;font-size:clamp(20px,4.5vw,27px);letter-spacing:.05em;background:none;border:none;cursor:pointer;padding:0;line-height:1.05;}
.rt-end.to-weekly .rt-end-next{color:${GOLD};}
.rt-end.to-daily .rt-end-next{color:var(--blit);}
.rt-end-next .arw{display:inline-flex;animation:rtnudge 1.1s ease-in-out infinite;}
.rt-end-line{width:40px;height:2px;animation:rtgrow 1.5s ease-in-out infinite;transform-origin:center;}
.rt-end.to-weekly .rt-end-line{background:${GOLD};}
.rt-end.to-daily .rt-end-line{background:var(--blit);}
.rt-replay{display:inline-flex;align-items:center;gap:7px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);background:none;border:1px solid rgba(240,236,226,0.25);padding:9px 16px;cursor:pointer;transition:border-color .2s,color .2s;}
.rt-replay:hover{border-color:var(--bone);color:var(--bone);}
@keyframes rtfade{from{opacity:0;}to{opacity:1;}}
@keyframes rtnudge{0%,100%{transform:translateX(0);}50%{transform:translateX(7px);}}
@keyframes rtgrow{0%,100%{opacity:.5;transform:scaleX(.65);}50%{opacity:1;transform:scaleX(1);}}

/* ── Full-ritual link ──────────────────────────── */
.rt-more{display:flex;justify-content:center;margin-top:28px;}
.rt-more a{display:inline-flex;align-items:center;gap:8px;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;color:var(--bone);text-decoration:none;padding:12px 28px;border:1px solid rgba(240,236,226,0.25);transition:border-color .2s;}
.rt-more a:hover{border-color:var(--bone);}
.rt-more svg{transition:transform .2s;}
.rt-more a:hover svg{transform:translateX(3px);}

@media(min-width:769px){
  .rt-stage{aspect-ratio:16/9;max-width:680px;}
  .rt-pi-d{display:block;}
  .rt-pi-m{display:none;}
}
@media(max-width:768px){
  .rt-section{padding:60px 20px;}
}
`;

const ARROW = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7h10M8 3l4 4-4 4" />
  </svg>
);

const PLAY = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

const ENDARROW = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4l6 6-6 6" />
  </svg>
);

const daily = RITUALS.daily;
const weekly = RITUALS.weekly;

function Tab({ id, active, onSelect }) {
  const r = RITUALS[id];
  const selected = active === id;
  const hint = id === 'daily' ? `▶ ${r.duration} film` : (WEEKLY_READY ? '▶ Watch' : '◇ Film soon');
  return (
    <button
      type="button"
      className={`rt-tab ${id} ${selected ? 'sel' : 'dim'}`}
      onClick={() => onSelect(id)}
      aria-pressed={selected}
    >
      <span className="rt-tab-top">
        <span className="rt-tab-dot" />
        <span className="rt-tab-name">{id === 'daily' ? 'Daily' : 'Weekly'}</span>
      </span>
      <span className="rt-tab-meta">{r.short}</span>
      <span className="rt-tab-hint">{hint}</span>
    </button>
  );
}

export default function RitualSection() {
  const [active, setActive] = useState('daily');
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const videoRef = useRef(null);
  const other = active === 'daily' ? 'weekly' : 'daily';

  const select = (id) => {
    if (id === active) return;
    if (videoRef.current) videoRef.current.pause();
    setPlaying(false);
    setEnded(false);
    setActive(id);
    capture('ritual_selected', { ritual: id, source: 'home_teaser' });
  };

  const play = () => {
    const v = videoRef.current;
    if (!v) return;
    setEnded(false);
    v.play();
    setPlaying(true);
    capture('ritual_video_played', { ritual: active, source: 'home_teaser' });
  };

  const replay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setEnded(false);
    v.play();
    setPlaying(true);
  };

  const showVideo = active === 'daily' || WEEKLY_READY;

  return (
    <>
      <style>{CSS}</style>
      <section className="rt-section" id="ritual">
        <div className="rt-inner">
          <div className="rt-eyebrow reveal">The Ritual System</div>
          <h2 className="rt-head reveal">The Ritual.</h2>
          <p className="rt-sub reveal">Two routines, one system. The daily ritual every shower, the weekly deep clean once a week.</p>

          <div className="rt-toggle reveal">
            <Tab id="daily" active={active} onSelect={select} />
            <Tab id="weekly" active={active} onSelect={select} />
          </div>

          <div className={`rt-stage ${active}`}>
            {showVideo ? (
              <>
                <video
                  ref={videoRef}
                  className="rt-video"
                  poster={DAILY_POSTER.desktop}
                  controls={playing}
                  preload="metadata"
                  playsInline
                  onEnded={() => { setPlaying(false); setEnded(true); }}
                >
                  <source src={DAILY_VIDEO.mobile} media="(max-width:768px)" />
                  <source src={DAILY_VIDEO.desktop} />
                </video>
                {!playing && !ended && (
                  <button className="rt-poster" onClick={play} aria-label="Watch the daily ritual film">
                    <span className="rt-poster-img rt-pi-d" />
                    <span className="rt-poster-img rt-pi-m" />
                    <span className="rt-scrim" />
                    <span className="rt-watch">
                      <span className="rt-play">{PLAY}</span>
                      <span className="rt-watch-label">Watch the daily film</span>
                    </span>
                    {daily.duration && <span className="rt-dur">{daily.duration}</span>}
                  </button>
                )}
                {ended && (
                  <div className={`rt-end to-${other}`}>
                    <span className="rt-end-done">{RITUALS[active].title} · Complete</span>
                    <button className="rt-end-next" onClick={() => select(other)}>
                      Now watch the {other === 'weekly' ? 'Weekly' : 'Daily'} Ritual
                      <span className="arw">{ENDARROW}</span>
                    </button>
                    <span className="rt-end-line" />
                    <button className="rt-replay" onClick={replay}>↻ Replay</button>
                  </div>
                )}
              </>
            ) : (
              <div className="rt-soon">
                <span className="rt-soon-badge">◇ Film coming soon</span>
                <span className="rt-soon-h">Weekly Ritual</span>
                <span className="rt-soon-p">The weekly deep-clean film is in production. Watch this space.</span>
              </div>
            )}
          </div>

          <div className="rt-more reveal">
            <a href="/ritual" onClick={() => capture('ritual_cta_clicked', { source: 'home_teaser' })}>
              See the full ritual {ARROW}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
