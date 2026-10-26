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
.hero-subline{font-size:18px;font-weight:300;letter-spacing:.25px;color:var(--mist);line-height:1.6;margin-bottom:30px;max-width:500px;animation:fadeUp .8s ease .9s both;}
.hero-actions{display:flex;flex-direction:column;gap:14px;animation:fadeUp .8s ease 1.05s both;}
.btn-primary{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:0.12em;background:var(--bone);color:var(--black);padding:18px 40px;text-decoration:none;display:block;text-align:center;transition:background .2s,transform .15s;}
.btn-primary:hover{background:#fff;transform:translateY(-1px);}
.hero-press-proof{display:none;}
/* Mobile: image on top, full width */
.hero-visual{position:relative;width:100%;height:56vw;min-height:220px;max-height:380px;overflow:hidden;flex-shrink:0;animation:fadeUp .8s ease .5s both;}
.hero-box-img{width:100%;height:100%;object-fit:cover;object-position:center 30%;display:block;}
.hero-visual-caption{display:none;}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}

/* ── Tablet ────────────────────────────────────────── */
@media(max-width:639px){
  .hero-title{font-size:31px;line-height:.98;}
}
@media(min-width:640px){
  .hero-actions{flex-direction:row;align-items:center;}
  .btn-primary{display:inline-block;text-align:left;}
}

/* ── Mobile/tablet: film as a full-bleed background, headline + CTA overlaid ── */
@media(max-width:959px){
  .hero{min-height:100svh;}
  .hero-visual{position:absolute;inset:0;width:100%;height:100%;min-height:100%;max-height:none;z-index:0;}
  .hero-visual .hero-box-img,.hero-visual video{object-position:center 18%;}
  .hero-cols{position:relative;z-index:1;justify-content:flex-end;min-height:100svh;padding:108px 24px 72px;
    background:linear-gradient(to top,rgba(8,9,11,0.82) 0%,rgba(8,9,11,0.54) 28%,rgba(8,9,11,0.14) 52%,rgba(8,9,11,0.02) 72%,rgba(8,9,11,0.1) 100%);}
  .hero-content{text-shadow:0 2px 18px rgba(0,0,0,.55);}
  .hero-editorial-frame{padding:0;background:transparent;border-color:transparent;border-top-color:transparent;box-shadow:none;backdrop-filter:none;}
  .hero-line{margin-bottom:14px;}
  .hero-sub-more{display:none;}
  .hero-title{font-size:clamp(31px,9.4vw,46px);line-height:.98;margin-bottom:14px;}
  .hero-subline{font-size:14px;line-height:1.45;margin-bottom:18px;}
  .btn-primary{padding:15px 32px;}
}

/* ── Desktop ───────────────────────────────────────── */
@media(min-width:960px){
  .hero{flex-direction:row;height:100svh;min-height:0;overflow:hidden;align-items:stretch;}
  .hero-cols{flex:0 0 52%;min-height:0;padding:clamp(82px,11vh,104px) 48px 40px;justify-content:flex-start;}
  .hero-content{max-width:600px;height:100%;}
  .hero-editorial-frame{box-sizing:border-box;display:flex;flex-direction:column;height:100%;padding:18px 20px 16px;}
  .hero-title{font-size:clamp(52px,4.5vw,72px);line-height:.92;margin-bottom:16px;}
  .hero-line{margin-bottom:12px;}
  .hero-subline{font-size:16px;line-height:1.45;margin-bottom:16px;}
  .hero-actions{gap:12px;}
  .btn-primary{padding:14px 28px;}
  .hero-press-proof{display:block;margin-top:auto;padding-top:24px;border-top:1px solid rgba(240,236,226,.16);}
  .hero-press-link{display:grid;grid-template-columns:136px minmax(0,1fr);gap:20px;color:inherit;text-decoration:none;}
  .hero-press-link:focus-visible{outline:2px solid var(--blit);outline-offset:5px;}
  .hero-press-label{display:block;margin-bottom:8px;font-size:10px;font-weight:700;letter-spacing:2.6px;text-transform:uppercase;color:var(--blit);}
  .hero-press-publication{display:block;font-family:Georgia,serif;font-size:25px;font-weight:700;letter-spacing:-.06em;line-height:.88;color:var(--bone);}
  .hero-press-publication span{display:block;font-size:13px;letter-spacing:-.025em;}
  .hero-press-quote{display:block;margin:0;font-family:'Barlow Condensed',sans-serif;font-size:21px;font-weight:300;line-height:1.1;letter-spacing:.01em;color:var(--bone);}
  .hero-press-read{display:block;margin-top:12px;font-size:10px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;color:rgba(240,236,226,.5);}
  /* Right panel: image fills full height */
  .hero-visual{flex:0 0 48%;width:48%;height:100%;max-height:none;min-height:0;}
  .hero-box-img{object-position:center center;}
  .hero-visual-caption{display:block;position:absolute;bottom:16px;right:20px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.4);font-weight:500;z-index:1;}
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
              <h1 className="hero-title">
                The shower ritual men were never given.
              </h1>
              <div className="hero-line" />
              <p className="hero-subline">
                A guided, deeper clean for your scalp, back, intimate areas and everything in between, with a clean finish that lasts.
              </p>
              <div className="hero-actions">
                {/* Scrolls to the kit cards (now ~fold 3) so cold traffic sees product + price before /buy */}
                <a
                  href="#kits"
                  className="btn-primary"
                  onClick={() => trackGoal('hero_cta_clicked', { variant: ctaVariant })}
                >
                  Start Your Ritual
                </a>
              </div>
              <div className="hero-press-proof">
                <a
                  className="hero-press-link"
                  href="https://www.luxurylifestylemag.co.uk/style-and-beauty/solum-pioneering-a-new-era-of-mens-body-care/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>
                    <span className="hero-press-label">As featured in</span>
                    <span className="hero-press-publication">Luxury<span>Lifestyle Magazine</span></span>
                  </span>
                    <span>
                      <span className="hero-press-quote">“Pioneering a new era of men’s body care”</span>
                    <span className="hero-press-read">Read the feature</span>
                  </span>
                </a>
              </div>
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
      </section>
    </>
  );
}
