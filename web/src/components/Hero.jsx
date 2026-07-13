import { useEffect, useState } from 'react';
import { useVariant, trackGoal } from '../hooks/useVariant';
import { BANNER } from '../data/productMedia.js';
import { offerActive } from '../lib/offer.js';
import { KITS, kitWorth } from '../data/kits.js';

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
.hero::before{content:'';position:absolute;inset:0;z-index:0;background-image:linear-gradient(rgba(46,109,164,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(46,109,164,0.03) 1px,transparent 1px);background-size:60px 60px;animation:gridFade 3s ease forwards;}
@keyframes gridFade{from{opacity:0;}to{opacity:1;}}
.hero-ghost{position:absolute;top:50%;left:50%;transform:translate(-50%,-52%);font-family:'Bebas Neue',sans-serif;font-size:clamp(110px,30vw,340px);letter-spacing:-0.04em;color:transparent;-webkit-text-stroke:1px rgba(46,109,164,0.06);pointer-events:none;user-select:none;white-space:nowrap;animation:ghostIn 2s cubic-bezier(.16,1,.3,1) .3s both;}
@keyframes ghostIn{from{opacity:0;transform:translate(-50%,-48%) scale(.96);}to{opacity:1;transform:translate(-50%,-52%) scale(1);}}
.hero-glow{position:absolute;top:30%;left:25%;transform:translate(-50%,-50%);width:500px;height:400px;background:radial-gradient(ellipse,rgba(46,109,164,0.07) 0%,transparent 70%);pointer-events:none;}
.hero-cols{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;justify-content:flex-start;padding:88px 24px 48px;gap:0;}
.hero-content{width:100%;}
.hero-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5vw,72px);line-height:.96;letter-spacing:0.03em;color:var(--bone);margin-bottom:24px;animation:fadeUp .8s ease .75s both;}

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
.hero-subline{font-size:17px;font-weight:300;letter-spacing:.3px;color:var(--mist);line-height:1.6;margin-bottom:28px;animation:fadeUp .8s ease .9s both;}
.hero-scope{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:32px;animation:fadeUp .8s ease .95s both;}
.hero-scope-pill{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);border:1px solid var(--lineb);padding:6px 12px;}
.hero-scope-pill.accent{color:var(--blit);border-color:rgba(46,109,164,0.3);}
.hero-actions{display:flex;flex-direction:column;gap:14px;animation:fadeUp .8s ease 1.05s both;}
.hero-sub-note{font-size:12px;color:var(--stone);font-weight:300;letter-spacing:.3px;margin-top:12px;line-height:1.5;}
.btn-primary{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:0.12em;background:var(--bone);color:var(--black);padding:18px 40px;text-decoration:none;display:block;text-align:center;transition:background .2s,transform .15s;}
.btn-primary:hover{background:#fff;transform:translateY(-1px);}
.btn-ghost{font-size:12px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);text-decoration:none;border-bottom:1px solid var(--lineb);padding-bottom:3px;transition:color .2s,border-color .2s;align-self:center;}
.btn-ghost:hover{color:var(--bone);border-color:var(--blue);}
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
  /* hero is ~88svh so the marquee below peeks into the first frame (scroll cue + a taste of "what SOLUM is") */
  .hero{min-height:88svh;}
  .hero-visual{position:absolute;inset:0;width:100%;height:100%;min-height:100%;max-height:none;z-index:0;}
  .hero-visual .hero-box-img,.hero-visual video{object-position:center 35%;}
  .hero-cols{position:relative;z-index:1;justify-content:flex-end;min-height:88svh;padding:108px 24px 36px;
    background:linear-gradient(to top,rgba(8,9,11,0.94) 0%,rgba(8,9,11,0.8) 30%,rgba(8,9,11,0.4) 58%,rgba(8,9,11,0.08) 86%,rgba(8,9,11,0.5) 100%);}
  /* keep the film readable — drop the long paragraph, pills and decorative layers on mobile. the peeking marquee replaces the scroll cue. */
  .hero-scope,.hero-ghost,.hero-glow,.scroll-cue{display:none;}
  .hero-sub-more{display:none;}
  .hero-subline{font-size:15px;line-height:1.5;margin-bottom:22px;}
}

/* ── Desktop ───────────────────────────────────────── */
@media(min-width:960px){
  .hero{flex-direction:row;height:100svh;min-height:640px;}
  .hero-cols{flex:0 0 48%;padding:80px 48px 64px;justify-content:flex-end;}
  .hero-ghost{font-size:clamp(180px,18vw,260px);left:24%;top:50%;}
  .hero-glow{left:24%;}
  /* Right panel: image fills full height */
  .hero-visual{flex:0 0 52%;width:52%;height:100%;max-height:none;min-height:100%;}
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
        <div className="hero-ghost">SOLUM</div>
        <div className="hero-glow" />
        <div className="hero-cols">
          <div className="hero-content">
            <h1 className="hero-title">
              You shower every day.<br />So why don't you feel clean?
            </h1>
            <div className="hero-line" />
            <p className="hero-subline"><span className="hero-sub-symptoms">Odour by midday. Rough skin. Spots on your back you can't reach. An itchy scalp.</span> <span className="hero-sub-more">A daily shower fixes none of it. SOLUM clears what's underneath, head to toe, in the 10 minutes you already spend in the shower. Every step laid out: what to use, when, and exactly how.</span></p>
            <div className="hero-actions">
              {/* Scrolls to the kit cards (now ~fold 3) so cold traffic sees product + price before /buy */}
              <a
                href="#kits"
                className="btn-primary"
                onClick={() => trackGoal('hero_cta_clicked', { variant: ctaVariant })}
              >
                Fix My Shower Routine
              </a>
            </div>
            {/* Value anchor is the first-tier signal; delivery is the quiet second line. */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                marginTop: 14,
                padding: '6px 12px',
                border: '1px solid #2E6DA4',
                borderRadius: 2,
                background: 'rgba(46,109,164,0.12)',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: '#F0ECE2',
              }}
            >
              <span style={{ color: '#4A8FC7', fontSize: 13 }}>✓</span>
              £{kitWorth(KITS.find(k => k.id === 'ritual'))} of product. Yours for £{KITS.find(k => k.id === 'ritual').firstBoxPrice}.
            </div>
            {offerActive() && (
              <div
                style={{
                  marginTop: 10,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '0.8px',
                  color: 'rgba(240,236,226,0.62)',
                }}
              >
                Free UK delivery · worth £5.95
              </div>
            )}
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
