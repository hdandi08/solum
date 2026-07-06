import { useState, useRef } from 'react';
import { BANNER_FULL } from '../data/productMedia.js';
import { capture } from '../lib/analytics';
import { markUnboxingProgress } from '../lib/qualifiedVisitTracker';

// The 71s kit film — extracted from the old SubscriptionSection so the film
// stays without any subscription/waitlist content. Feeds the unboxing_50
// qualified-visit signal.
const CSS = `
.unbox-section{background:var(--black);padding:100px 48px;border-top:1px solid var(--line);}
.unbox-inner{max-width:1400px;margin:0 auto;}
.unbox-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:14px;text-align:center;}
.unbox-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,5vw,56px);letter-spacing:.05em;color:var(--bone);line-height:1;text-align:center;margin-bottom:36px;}
.unbox-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;}
.unbox-main{position:relative;overflow:hidden;background:#000;border:1px solid var(--line);}
.unbox-main img,.unbox-main video{width:100%;height:100%;object-fit:cover;display:block;}
.unbox-side{display:flex;flex-direction:column;gap:16px;}
.unbox-side-shot{overflow:hidden;border:1px solid var(--line);flex:1;}
.unbox-side-shot img{width:100%;height:100%;object-fit:cover;display:block;}
.unbox-play{position:absolute;inset:0;width:100%;height:100%;border:none;padding:0;cursor:pointer;background:none;display:block;}
.unbox-scrim{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(8,9,11,0.6),rgba(8,9,11,0) 42%),linear-gradient(to top,rgba(8,9,11,0.55),rgba(8,9,11,0) 45%,rgba(8,9,11,0) 70%,rgba(8,9,11,0.4));}
.unbox-watch{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:12px;}
.unbox-play-ring{position:relative;width:76px;height:76px;border-radius:50%;background:rgba(46,109,164,0.72);border:2px solid var(--bone);box-shadow:0 4px 24px rgba(8,9,11,0.6),0 0 0 6px rgba(74,143,199,0.18);display:flex;align-items:center;justify-content:center;color:var(--bone);backdrop-filter:blur(3px);transition:transform .2s,background .2s,border-color .2s;}
.unbox-play-ring::after{content:'';position:absolute;inset:-2px;border-radius:50%;border:2px solid rgba(74,143,199,0.6);animation:unboxpulse 2s ease-out infinite;}
@keyframes unboxpulse{0%{transform:scale(1);opacity:.7;}100%{transform:scale(1.5);opacity:0;}}
@media(prefers-reduced-motion:reduce){.unbox-play-ring::after{animation:none;}}
.unbox-play:hover .unbox-play-ring{transform:scale(1.08);background:var(--blit);border-color:var(--blit);}
.unbox-watch-label{font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;color:var(--bone);text-transform:uppercase;text-shadow:0 1px 8px rgba(8,9,11,0.8);}
.unbox-dur{position:absolute;bottom:12px;right:12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;background:rgba(8,9,11,0.5);padding:4px 8px;}
.unbox-caption{font-size:13px;color:var(--stone);font-weight:300;text-align:center;margin-top:16px;max-width:560px;margin-left:auto;margin-right:auto;line-height:1.6;}
@media(max-width:768px){.unbox-grid{grid-template-columns:1fr;}.unbox-side{flex-direction:row;}.unbox-section{padding:60px 24px;}}
`;

const PLAY_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

export default function UnboxingFilm() {
  const [filmPlaying, setFilmPlaying] = useState(false);
  const filmRef = useRef(null);
  const progressFired = useRef(new Set());

  function onTimeUpdate() {
    const v = filmRef.current;
    if (!v || !v.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    for (const m of [25, 50, 75, 100]) {
      if (pct >= m && !progressFired.current.has(m)) {
        progressFired.current.add(m);
        capture('unboxing_video_progress', { percent: m, source: 'unboxing' });
        markUnboxingProgress(m);
      }
    }
  }

  function playFilm() {
    const v = filmRef.current;
    if (!v) return;
    v.play();
    setFilmPlaying(true);
  }

  return (
    <>
      <style>{CSS}</style>
      <section className="unbox-section" id="unboxing" data-track="unboxing">
        <div className="unbox-inner">
          <div className="unbox-band reveal">
            <div className="unbox-eyebrow">The Unboxing</div>
            <h2 className="unbox-head">Head to toe.<br />Cared for.</h2>
            <div className="unbox-grid">
              <div className="unbox-main">
                {BANNER_FULL.ready ? (
                  <>
                    <video
                      ref={filmRef}
                      poster="/products/kit/still.webp"
                      controls={filmPlaying}
                      preload="metadata"
                      playsInline
                      onEnded={() => setFilmPlaying(false)}
                      onTimeUpdate={onTimeUpdate}
                    >
                      <source src={BANNER_FULL.mp4} type="video/mp4" />
                    </video>
                    {!filmPlaying && (
                      <button className="unbox-play" onClick={playFilm} aria-label="Watch the SOLUM kit film">
                        <span className="unbox-scrim" />
                        <span className="unbox-watch">
                          <span className="unbox-play-ring">{PLAY_ICON}</span>
                          <span className="unbox-watch-label">Watch the film</span>
                        </span>
                        <span className="unbox-dur">71s</span>
                      </button>
                    )}
                  </>
                ) : (
                  <img
                    src="/products/kit/still.webp"
                    width={1200}
                    height={1500}
                    loading="lazy"
                    alt="SOLUM kit flatlay — body wash, lotion, scalp massager, exfoliating mitt and back scrub cloth arranged on a dark surface"
                  />
                )}
              </div>
              <div className="unbox-side">
                <div className="unbox-side-shot">
                  <img src="/products/kit/use-1.webp" width={1200} height={1500} loading="lazy" alt="SOLUM kit products laid out showing the daily ritual tools" />
                </div>
                <div className="unbox-side-shot">
                  <img src="/products/kit/use-2.webp" width={1200} height={1500} loading="lazy" alt="Close-up of SOLUM kit packaging and product detail" />
                </div>
              </div>
            </div>
            <p className="unbox-caption">Every kit ships as one system. Wash, tools, and lotion together. Nothing to figure out, nothing missing.</p>
          </div>
        </div>
      </section>
    </>
  );
}
