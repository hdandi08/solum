import { useVariant, trackGoal } from '../hooks/useVariant';

const IS_FIRST_BATCH = import.meta.env.VITE_SITE_MODE === 'first_batch';
const IS_FATHERS_DAY = new URLSearchParams(window.location.search).get('occasion') === 'fathers-day';

const CSS = `
/* ── Mobile first ─────────────────────────────────── */
.hero{min-height:100svh;display:flex;align-items:flex-end;padding:80px 24px 56px;position:relative;overflow:hidden;background:var(--black);}
.hero::before{content:'';position:absolute;inset:0;z-index:0;background-image:linear-gradient(rgba(46,109,164,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(46,109,164,0.03) 1px,transparent 1px);background-size:60px 60px;animation:gridFade 3s ease forwards;}
@keyframes gridFade{from{opacity:0;}to{opacity:1;}}
.hero-ghost{position:absolute;top:50%;left:50%;transform:translate(-50%,-52%);font-family:'Bebas Neue',sans-serif;font-size:clamp(110px,30vw,340px);letter-spacing:-0.04em;color:transparent;-webkit-text-stroke:1px rgba(46,109,164,0.06);pointer-events:none;user-select:none;white-space:nowrap;animation:ghostIn 2s cubic-bezier(.16,1,.3,1) .3s both;}
@keyframes ghostIn{from{opacity:0;transform:translate(-50%,-48%) scale(.96);}to{opacity:1;transform:translate(-50%,-52%) scale(1);}}
.hero-glow{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);width:600px;height:500px;background:radial-gradient(ellipse,rgba(46,109,164,0.07) 0%,transparent 70%);pointer-events:none;}
.hero-cols{position:relative;z-index:1;display:flex;flex-direction:column;width:100%;gap:0;}
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
.hero-visual{display:flex;flex-direction:column;align-items:center;order:-1;width:100%;margin-bottom:28px;animation:fadeUp .8s ease .5s both;}
.hero-box-img{width:100%;max-width:100%;height:auto;object-fit:cover;border-radius:3px;box-shadow:0 24px 60px rgba(0,0,0,.8);}
.hero-visual-label{display:none;}
.scroll-cue{position:absolute;bottom:24px;right:24px;z-index:1;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);animation:fadeUp .8s ease 1.4s both;}
.scroll-line{width:1px;height:40px;background:linear-gradient(to bottom,var(--blue),transparent);animation:scrollPulse 2s ease-in-out 2s infinite;}
@keyframes scrollPulse{0%,100%{opacity:.4;}50%{opacity:1;}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
/* ── Father's Day variant ──────────────────────── */
.hero-fd-badge{display:inline-flex;align-items:center;gap:8px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#c8a96e;border:1px solid rgba(200,169,110,0.35);padding:6px 12px;margin-bottom:24px;animation:fadeUp .8s ease .5s both;}
.hero-fd-dot{width:5px;height:5px;border-radius:50%;background:#c8a96e;flex-shrink:0;}
.hero-fd-deadline{font-size:12px;color:var(--stone);font-weight:300;letter-spacing:.3px;margin-top:14px;line-height:1.5;border-top:1px solid var(--lineb);padding-top:12px;}
.hero-fd-deadline strong{color:#c8a96e;font-weight:600;}

/* ── Tablet ────────────────────────────────────────── */
@media(max-width:639px){
  .hero-title{font-size:36px;line-height:.96;}
}
@media(min-width:640px){
  .hero-actions{flex-direction:row;align-items:center;}
  .btn-primary{display:inline-block;text-align:left;}
  .btn-ghost{align-self:auto;}
}

/* ── Desktop ───────────────────────────────────────── */
@media(min-width:960px){
  .hero{padding:80px 48px 80px;}
  .hero-cols{flex-direction:row;align-items:flex-end;gap:48px;}
  .hero-content{flex:0 0 55%;max-width:600px;}
  .hero-ghost{font-size:clamp(180px,22vw,340px);}
  .hero-glow{left:35%;}
  .hero-visual{flex:0 0 42%;flex-direction:column;align-items:flex-end;justify-content:flex-end;order:0;width:auto;margin-bottom:0;}
  .hero-box-img{width:100%;max-width:560px;height:auto;object-fit:cover;border-radius:3px;box-shadow:0 32px 80px rgba(0,0,0,.85);}
  .hero-visual-label{display:flex;align-items:center;gap:8px;margin-top:16px;align-self:flex-end;}
  .hero-visual-dot{width:5px;height:5px;border-radius:50%;background:var(--blue);}
  .hero-visual-tag{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;}
  .scroll-cue{bottom:32px;right:48px;}
  .scroll-line{height:48px;}
}
`;

export default function Hero() {
  const ctaVariant = useVariant('hero-cta-copy');

  return (
    <>
      <style>{CSS}</style>
      <section className="hero" id="home">
        <div className="hero-ghost">SOLUM</div>
        <div className="hero-glow" />
        <div className="hero-cols">
          <div className="hero-content">
            {IS_FATHERS_DAY ? (
              <>
                <div className="hero-fd-badge">
                  <span className="hero-fd-dot" />
                  Father's Day · June 21
                </div>
                <h1 className="hero-title">
                  Give Him<br />
                  The Ritual<br />
                  He Never Had.
                </h1>
                <div className="hero-line" />
                <p className="hero-subline">He showers every day. This changes what that means.</p>
                <div className="hero-scope">
                  <span className="hero-scope-pill accent">Head to Toe</span>
                  <span className="hero-scope-pill accent">Ten Products</span>
                </div>
                <div className="hero-actions">
                  <a
                    href="/buy?kit=ritual&source=fathers-day"
                    className="btn-primary"
                    onClick={() => trackGoal('hero_cta_clicked', { variant: 'fathers-day-ritual' })}
                  >
                    Gift the RITUAL Kit
                  </a>
                  <a href="/buy?kit=ground&source=fathers-day" className="btn-ghost">Gift the GROUND Kit</a>
                </div>
                <p className="hero-fd-deadline">
                  Order by <strong>June 19</strong> for Father's Day delivery · Royal Mail Tracked
                </p>
              </>
            ) : (
              <>
                <h1 className="hero-title">
                  The First Guided<br />
                  <span className="swap-container">
                    <span className="word-body">Body</span>
                    <span className="word-face">
                      Face
                      <span className="strike-line" />
                    </span>
                  </span>
                  {' '}Ritual<br />
                  For Men.
                </h1>
                <div className="hero-line" />
                <p className="hero-subline">You shower every day. Your body is still not clean. Dead skin builds up for years. Odour comes from bacteria feeding on dead cells, not sweat. Skin dries out by midday because nothing is actually maintaining it. SOLUM fixes all of it — in ten minutes, in the shower you already take.</p>
                <div className="hero-scope">
                  <span className="hero-scope-pill accent">Body Care — Not Face, Not Hair</span>
                  <span className="hero-scope-pill accent">Built For Men</span>
                </div>
                <div className="hero-actions">
                  <a
                    href={IS_FIRST_BATCH ? '/buy' : '#kits'}
                    className="btn-primary"
                    onClick={() => trackGoal('hero_cta_clicked', { variant: ctaVariant })}
                  >
                    Get Your Kit
                  </a>
                  <a href="#kits" className="btn-ghost">See The Kits</a>
                </div>
                <p className="hero-sub-note">Subscription coming soon</p>
              </>
            )}
          </div>
          <div className="hero-visual">
            <img src="/solum-hero.jpg" alt="SOLUM kit — open box with all products" className="hero-box-img" />
            <div className="hero-visual-label">
              <span className="hero-visual-dot" />
              <span className="hero-visual-tag">RITUAL Kit · bysolum.co.uk</span>
            </div>
          </div>
        </div>
        <div className="scroll-cue"><div className="scroll-line" />Scroll</div>
      </section>
    </>
  );
}
