import { useNavigate } from 'react-router-dom';
import { useVariant, trackGoal } from '../hooks/useVariant';
import { buyClick } from '../lib/addToCartTracker.js';


const CTA_COPY = { control: 'Choose Your Kit', ritual: 'Build Your Ritual' };

const CSS = `
.cta-section{background:var(--char);border-top:1px solid var(--lineb);text-align:center;padding:140px 48px;position:relative;overflow:hidden;}
.cta-section::before{content:'SOLUM';pointer-events:none;user-select:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Bebas Neue',sans-serif;font-size:clamp(200px,28vw,380px);letter-spacing:-4px;color:transparent;-webkit-text-stroke:1px rgba(46,109,164,0.04);white-space:nowrap;}
.cta-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);margin-bottom:24px;position:relative;}
.cta-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(56px,6vw,96px);letter-spacing:.06em;color:var(--bone);line-height:1;margin-bottom:24px;position:relative;}
.cta-body{font-size:17px;color:var(--stone);font-weight:300;max-width:480px;margin:0 auto 16px;line-height:1.7;position:relative;}
.cta-offer{font-size:15px;color:var(--blue);font-weight:500;margin-bottom:48px;position:relative;letter-spacing:1px;}
.cta-btns{display:flex;justify-content:center;gap:16px;position:relative;}
.cta-btn-primary{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:0.12em;background:var(--bone);color:var(--black);padding:16px 40px;text-decoration:none;display:inline-block;transition:background .2s,transform .15s;}
.cta-btn-primary:hover{background:#fff;transform:translateY(-1px);}
@media(max-width:768px){.cta-section{padding:80px 24px;}.cta-btns{flex-direction:column;align-items:center;}}
`;

export default function CTASection() {
  const navigate = useNavigate();
  const ctaVariant = useVariant('hero-cta-copy');
  const ctaLabel = CTA_COPY[ctaVariant] ?? CTA_COPY.control;

  return (
    <>
      <style>{CSS}</style>
      <section className="cta-section" data-track="cta">
        <div className="cta-tag">Your body. Done right.</div>
        <h2 className="cta-title">Your Body.<br />Done Right.</h2>
        <p className="cta-body">
          The system that should have existed twenty years ago. It exists now.
        </p>
        <div className="cta-offer">250 kits only · one-time purchase · GROUND £65 · RITUAL £85</div>
        <div className="cta-btns">
          <a
            href="/buy?kit=ritual"
            className="cta-btn-primary"
            onClick={(e) => { trackGoal('bottom_cta_clicked', { variant: 'ritual' }); buyClick(e, navigate, '/buy?kit=ritual', 'ritual'); }}
          >
            Build My Ritual · £85
          </a>
          <a
            href="/buy?kit=ground"
            className="cta-btn-primary"
            style={{ background: 'transparent', color: 'var(--bone)', border: '1px solid rgba(240,236,226,0.25)' }}
            onClick={(e) => { trackGoal('bottom_cta_clicked', { variant: 'ground' }); buyClick(e, navigate, '/buy?kit=ground', 'ground'); }}
          >
            Or start with Ground · £65
          </a>
        </div>
      </section>
    </>
  );
}
