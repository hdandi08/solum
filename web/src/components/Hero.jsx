import { useVariant, trackGoal } from '../hooks/useVariant';

const CTA_COPY = {
  control: 'Choose Your Kit',
  ritual:  'Build Your Ritual',
};

const CSS = `
.hero{min-height:100vh;display:flex;align-items:flex-end;padding:80px 48px 80px;position:relative;overflow:hidden;background:var(--black);}
.hero::before{content:'';position:absolute;inset:0;z-index:0;background-image:linear-gradient(rgba(46,109,164,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(46,109,164,0.03) 1px,transparent 1px);background-size:80px 80px;animation:gridFade 3s ease forwards;}
@keyframes gridFade{from{opacity:0;}to{opacity:1;}}
.hero-ghost{position:absolute;top:50%;left:50%;transform:translate(-50%,-52%);font-family:'Bebas Neue',sans-serif;font-size:clamp(180px,22vw,340px);letter-spacing:-0.04em;color:transparent;-webkit-text-stroke:1px rgba(46,109,164,0.07);pointer-events:none;user-select:none;white-space:nowrap;animation:ghostIn 2s cubic-bezier(.16,1,.3,1) .3s both;}
@keyframes ghostIn{from{opacity:0;transform:translate(-50%,-48%) scale(.96);}to{opacity:1;transform:translate(-50%,-52%) scale(1);}}
.hero-glow{position:absolute;top:30%;left:35%;transform:translate(-50%,-50%);width:900px;height:700px;background:radial-gradient(ellipse,rgba(46,109,164,0.06) 0%,transparent 70%);pointer-events:none;}
.hero-cols{position:relative;z-index:1;display:flex;align-items:flex-end;width:100%;gap:48px;}
.hero-content{flex:0 0 55%;max-width:600px;}
.hero-eyebrow{font-size:13px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);margin-bottom:24px;display:flex;align-items:center;gap:12px;animation:fadeUp .8s ease .6s both;}
.hero-eyebrow::before{content:'';width:32px;height:1px;background:var(--blue);}
.hero-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(60px,6.5vw,104px);line-height:.92;letter-spacing:0.03em;color:var(--bone);margin-bottom:32px;animation:fadeUp .8s ease .75s both;}
.hero-title em{font-style:normal;color:var(--blue);}
.hero-line{width:100%;height:1px;background:linear-gradient(to right,var(--blue) 0%,transparent 60%);margin-bottom:28px;animation:lineIn 1s ease 1s both;transform-origin:left;}
@keyframes lineIn{from{transform:scaleX(0);opacity:0;}to{transform:scaleX(1);opacity:1;}}
.hero-body{font-size:17px;font-weight:300;letter-spacing:.3px;color:var(--mist);line-height:1.7;margin-bottom:20px;animation:fadeUp .8s ease .9s both;}
.hero-scope{display:inline-flex;align-items:center;gap:10px;border:1px solid var(--lineb);padding:9px 18px;margin-bottom:40px;animation:fadeUp .8s ease .95s both;}
.hero-scope-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;}
.hero-scope-divider{width:1px;height:14px;background:var(--lineb);}
.hero-scope-note{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
.hero-actions{display:flex;gap:16px;align-items:center;animation:fadeUp .8s ease 1.05s both;}
.btn-primary{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:0.12em;background:var(--bone);color:var(--black);padding:16px 40px;text-decoration:none;display:inline-block;transition:background .2s,transform .15s;}
.btn-primary:hover{background:#fff;transform:translateY(-1px);}
.btn-ghost{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);text-decoration:none;border-bottom:1px solid var(--lineb);padding-bottom:3px;transition:color .2s,border-color .2s;}
.btn-ghost:hover{color:var(--bone);border-color:var(--blue);}
.hero-visual{flex:0 0 42%;display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-end;gap:0;padding-bottom:0;animation:fadeUp .8s ease .5s both;}
.hero-box-img{width:100%;max-width:480px;height:auto;object-fit:contain;display:block;filter:drop-shadow(0 32px 64px rgba(0,0,0,.7));}
.hero-visual-label{display:flex;align-items:center;gap:8px;margin-top:16px;align-self:flex-end;}
.hero-visual-dot{width:5px;height:5px;border-radius:50%;background:var(--blue);}
.hero-visual-tag{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.scroll-cue{position:absolute;bottom:32px;right:48px;z-index:1;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);animation:fadeUp .8s ease 1.4s both;}
.scroll-line{width:1px;height:48px;background:linear-gradient(to bottom,var(--blue),transparent);animation:scrollPulse 2s ease-in-out 2s infinite;}
@keyframes scrollPulse{0%,100%{opacity:.4;}50%{opacity:1;}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
@media(max-width:960px){.hero-visual{display:none;}.hero-content{flex:1;max-width:100%;}}
@media(max-width:768px){.hero{padding:80px 24px 60px;}.hero-title{font-size:clamp(48px,12vw,80px);}}
`;

export default function Hero() {
  const ctaVariant = useVariant('hero-cta-copy');
  const ctaLabel = CTA_COPY[ctaVariant] ?? CTA_COPY.control;

  return (
    <>
      <style>{CSS}</style>
      <section className="hero" id="home">
        <div className="hero-ghost">SOLUM</div>
        <div className="hero-glow" />
        <div className="hero-cols">
          <div className="hero-content">
            <div className="hero-eyebrow">Men shower. Men don't actually clean.</div>
            <h1 className="hero-title">
              You Shower<br />Every Day.<br /><em>Your Body Is</em><br /><em>Still Dirty.</em>
            </h1>
            <div className="hero-line" />
            <p className="hero-body">
              Not your fault. Nobody ever built men a system worth following.
              There's a difference between being washed and being clean. Most men have never felt it.
              SOLUM fixes that. A few weeks and it's muscle memory. After that, you just do it.
            </p>
            <div className="hero-scope">
              <span className="hero-scope-label">Real Results</span>
              <span className="hero-scope-divider" />
              <span className="hero-scope-note">Your Body — Head to Toe.</span>
            </div>
            <div className="hero-actions">
              <a href="#kits" className="btn-primary" onClick={() => trackGoal('hero_cta_clicked', { variant: ctaVariant })}>{ctaLabel}</a>
              <a href="#truth" className="btn-ghost">Why It Matters</a>
            </div>
          </div>
          <div className="hero-visual">
            <img src="/box-exterior.png" alt="SOLUM kit" className="hero-box-img" />
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
