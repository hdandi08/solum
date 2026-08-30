import { useEffect, useState } from 'react';
import { useVariant, trackGoal } from '../hooks/useVariant';
import { BANNER } from '../data/productMedia.js';

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SMALL_SCREEN = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

// Keep the hero video off the critical path: the poster paints immediately and
// the <video> only mounts once the page has finished loading, so the loop never
// competes with the app bundle for bandwidth. Phones get the 540p rendition.
function useHeroVideoReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!BANNER.ready || REDUCE_MOTION) return;
    const start = () => setReady(true);
    if (document.readyState === 'complete') { start(); return; }
    window.addEventListener('load', start, { once: true });
    return () => window.removeEventListener('load', start);
  }, []);
  return ready;
}

const CSS = `
/* ── Mobile first ─────────────────────────────────── */
.hero{min-height:100svh;display:flex;flex-direction:column;position:relative;overflow:hidden;background:var(--black);padding:0;}
.hero::before{content:'';position:absolute;inset:0;z-index:0;background:linear-gradient(90deg,rgba(240,236,226,.035),transparent 28%,transparent 72%,rgba(46,109,164,.08));pointer-events:none;}
.hero-cols{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;justify-content:flex-start;padding:88px 24px 48px;gap:0;}
.hero-content{width:100%;max-width:620px;}
.hero-editorial-frame{border:1px solid rgba(240,236,226,.14);border-top:2px solid rgba(240,236,226,.28);padding:26px 24px 24px;background:rgba(8,9,11,.32);box-shadow:0 26px 70px rgba(0,0,0,.18);}
.hero-kicker{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:700;margin-bottom:18px;animation:fadeUp .8s ease .68s both;}
.hero-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(42px,6.2vw,88px);line-height:.9;letter-spacing:0.045em;color:var(--bone);margin-bottom:24px;animation:fadeUp .8s ease .75s both;}

/* ── Animated word swap ────────────────────────────── */
.swap-container{display:inline-grid;position:relative;}
.word-body,.word-face{grid-area:1/1;}
.word-body{color:var(--bone);animation:bodyWord 5s ease-in-out 1.8s infinite both;}
.word-face{color:var(--stone);position:relative;animation:faceWord 5s ease-in-out 1.8s infinite both;}
.strike-line{position:absolute;left:0;right:0;top:46%;height:3px;background:var(--blue);transform:scaleX(0);transform-origin:left;animation:strikeThrough 5s ease-in-out 1.8s infinite both;}
@keyframes bodyWord{0%,38%{opacity:1;transform:translateY(0);}46%,76%{opacity:0;transform:translateY(-8px);}84%,100%{opacity:1;transform:translateY(0);}}
@keyframes faceWord{0%,38%{opacity:0;transform:translateY(8px);}46%,76%{opacity:1;transform:translateY(0);}84%,100%{opacity:0;transform:translateY(8px);}}
@keyframes strikeThrough{0%,44%{transform:scaleX(0);}56%,100%{transform:scaleX(1);}}

.hero-line{width:56px;height:1px;background:linear-gradient(to right,var(--blue),transparent);margin-bottom:20px;animation:lineIn 1s ease 1s both;transform-origin:left;}
@keyframes lineIn{from{transform:scaleX(0);opacity:0;}to{transform:scaleX(1);opacity:1;}}
.hero-subline{font-size:18px;font-weight:300;letter-spacing:.25px;color:var(--mist);line-height:1.65;margin-bottom:30px;max-width:520px;animation:fadeUp .8s ease .9s both;}
.hero-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin:0 0 30px;animation:fadeUp .8s ease .98s both;}
.hero-meta-item{padding:13px 14px;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:4px;}
.hero-meta-item:last-child{border-right:0;}
.hero-meta-label{font-size:10px;letter-spacing:2.8px;text-transform:uppercase;color:var(--stone);font-weight:700;}
.hero-meta-value{font-size:14px;color:var(--bone);font-weight:300;line-height:1.25;}
.hero-scope{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:32px;animation:fadeUp .8s ease .95s both;}
.hero-scope-pill{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);border:1px solid var(--lineb);padding:6px 12px;}
.hero-scope-pill.accent{color:var(--blit);border-color:rgba(46,109,164,0.3);}
.hero-actions{display:flex;flex-direction:column;gap:14px;animation:fadeUp .8s ease 1.05s both;}
.hero-proof-strip{display:grid;grid-template-columns:1fr;gap:10px;margin-top:18px;padding-top:16px;border-top:1px solid rgba(240,236,226,.14);animation:fadeUp .8s ease 1.08s both;}
.hero-proof-kicker{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);font-weight:700;}
.hero-proof-main{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.08em;color:var(--bone);line-height:1;}
.hero-proof-copy{font-size:13px;color:rgba(240,236,226,.62);font-weight:300;line-height:1.45;max-width:430px;}
.hero-sub-note{font-size:12px;color:var(--stone);font-weight:300;letter-spacing:.3px;margin-top:12px;line-height:1.5;}
.btn-primary{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:0.12em;background:var(--bone);color:var(--black);padding:18px 40px;text-decoration:none;display:block;text-align:center;transition:background .2s,transform .15s;}
.btn-primary:hover{background:#fff;transform:translateY(-1px);}
.btn-ghost{font-size:12px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);text-decoration:none;border-bottom:1px solid var(--lineb);padding-bottom:3px;transition:color .2s,border-color .2s;align-self:center;}
.btn-ghost:hover{color:var(--bone);border-color:var(--blue);}
.hero-editorial-note{margin-top:18px;font-size:13px;color:rgba(240,236,226,.62);font-weight:300;letter-spacing:.8px;line-height:1.5;animation:fadeUp .8s ease 1.12s both;}
.hero-editorial-note span{color:var(--blit);font-weight:600;letter-spacing:1.4px;text-transform:uppercase;}
/* Mobile: image on top, full width */
.hero-visual{position:relative;width:100%;height:56vw;min-height:220px;max-height:380px;overflow:hidden;flex-shrink:0;animation:fadeUp .8s ease .5s both;}
.hero-box-img{width:100%;height:100%;object-fit:cover;object-position:center 30%;display:block;}
.hero-visual-caption{display:none;}
.scroll-cue{position:absolute;bottom:24px;left:24px;z-index:2;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);animation:fadeUp .8s ease 1.4s both;}
.scroll-line{width:1px;height:40px;background:linear-gradient(to bottom,var(--blue),transparent);animation:scrollPulse 2s ease-in-out 2s infinite;}
@keyframes scrollPulse{0%,100%{opacity:.4;}50%{opacity:1;}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}

/* ── Tablet ────────────────────────────────────────── */
@media(max-width:639px){
  .hero-title{font-size:36px;line-height:.96;}
}
@media(min-width:640px){
  .hero-actions{flex-direction:row;align-items:center;}
  .btn-primary{display:inline-block;text-align:left;}
  .btn-ghost{align-self:auto;}
}

/* ── Mobile/tablet: film as a full-bleed background, headline + CTA overlaid ── */
@media(max-width:959px){
  .hero{min-height:100svh;}
  .hero-visual{position:absolute;inset:0;width:100%;height:100%;min-height:100%;max-height:none;z-index:0;}
  .hero-visual .hero-box-img,.hero-visual video{object-position:center 22%;}
  .hero-cols{position:relative;z-index:1;justify-content:flex-end;min-height:100svh;padding:108px 24px 72px;
    background:linear-gradient(to top,rgba(8,9,11,0.86) 0%,rgba(8,9,11,0.62) 30%,rgba(8,9,11,0.24) 58%,rgba(8,9,11,0.04) 84%,rgba(8,9,11,0.18) 100%);}
  /* keep the film readable by dropping secondary proof and metadata on mobile. */
  .hero-scope,.scroll-cue{display:none;}
  .hero-editorial-frame{padding:18px 16px 18px;background:rgba(8,9,11,.46);box-shadow:0 18px 50px rgba(0,0,0,.18);}
  .hero-sub-more{display:none;}
  .hero-title{font-size:clamp(42px,13vw,62px);}
  .hero-subline{font-size:15px;line-height:1.5;margin-bottom:22px;}
  .hero-meta,.hero-proof-strip,.hero-editorial-note{display:none;}
}

/* ── Desktop ───────────────────────────────────────── */
@media(min-width:960px){
  .hero{flex-direction:row;height:auto;min-height:calc(100svh + 88px);overflow:visible;align-items:stretch;}
  .hero-cols{flex:0 0 48%;min-height:calc(100svh + 88px);padding:clamp(124px,14vh,152px) 48px 112px;justify-content:flex-start;}
  /* Right panel: image fills full height */
  .hero-visual{flex:0 0 52%;width:52%;height:auto;max-height:none;min-height:calc(100svh + 88px);}
  .hero-box-img{object-position:center center;}
  .hero-visual-caption{display:block;position:absolute;bottom:16px;right:20px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.4);font-weight:500;z-index:1;}
  .scroll-cue{bottom:40px;left:48px;}
  .scroll-line{height:48px;}
}
`;

export default function Hero() {
  const videoReady = useHeroVideoReady();
  const ctaVariant = useVariant('hero-cta-copy');

  return (
    <>
      <style>{CSS}</style>
      <section className="hero" id="home">
        <div className="hero-cols">
          <div className="hero-content">
            <div className="hero-editorial-frame">
              <div className="hero-kicker">Body care, rebuilt as a ritual</div>
              <h1 className="hero-title">
                Your body.<br />Finally done right.
              </h1>
              <div className="hero-line" />
              <p className="hero-subline"><span className="hero-sub-symptoms">For the back, scalp and skin your shower keeps missing.</span> <span className="hero-sub-more">Built for the ten minutes you already spend in the shower: what to use, when, and exactly how.</span></p>
              <div className="hero-meta" aria-label="SOLUM ritual summary">
                <div className="hero-meta-item">
                  <span className="hero-meta-label">System</span>
                  <span className="hero-meta-value">Guided, not guessed</span>
                </div>
                <div className="hero-meta-item">
                  <span className="hero-meta-label">Ritual</span>
                  <span className="hero-meta-value">10 minutes daily</span>
                </div>
                <div className="hero-meta-item">
                  <span className="hero-meta-label">Scope</span>
                  <span className="hero-meta-value">Body, not face</span>
                </div>
              </div>
              <div className="hero-actions">
                {/* Scrolls to the kit cards (now ~fold 3) so cold traffic sees product + price before /buy */}
                <a
                  href="#kits"
                  className="btn-primary"
                  onClick={() => trackGoal('hero_cta_clicked', { variant: ctaVariant })}
                >
                  See the Kits
                </a>
                <a href="#press" className="btn-ghost">Read the press</a>
              </div>
              <div className="hero-proof-strip">
                <div className="hero-proof-kicker">Luxury Lifestyle Magazine</div>
                <div className="hero-proof-main">The ritual your shower was missing</div>
                <div className="hero-proof-copy">SOLUM is built around the work most showers skip.</div>
              </div>
              <p className="hero-editorial-note">
                <span>Press recognised</span> · Featured by Luxury Lifestyle Magazine.
              </p>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          {videoReady ? (
            <video
              className="hero-box-img"
              poster={SMALL_SCREEN ? BANNER.mobilePoster : BANNER.poster}
              muted
              autoPlay
              loop
              playsInline
              preload="auto"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
            >
              <source src={SMALL_SCREEN ? BANNER.mobileWebm : BANNER.webm} type="video/webm" />
              <source src={SMALL_SCREEN ? BANNER.mobileMp4 : BANNER.mp4} type="video/mp4" />
            </video>
          ) : (
            // LCP element on mobile — srcset matches the preload in index.html so the
            // browser reuses the already-fetched rendition instead of a second download.
            <img
              src={BANNER.poster}
              srcSet={`${BANNER.mobilePoster} 960w, ${BANNER.poster} 1920w`}
              sizes="(max-width: 959px) 100vw, 52vw"
              fetchPriority="high"
              alt=""
              aria-hidden="true"
              className="hero-box-img"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
            />
          )}
          <span className="hero-visual-caption" style={{ position: 'relative', zIndex: 1 }}>RITUAL Kit · bysolum.co.uk</span>
        </div>
        <div className="scroll-cue"><div className="scroll-line" />Scroll</div>
      </section>
    </>
  );
}
