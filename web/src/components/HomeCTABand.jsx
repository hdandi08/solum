import { capture } from '../lib/analytics.js';

const CSS = `
.home-ctaband{background:var(--char);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:44px 24px;}
.home-ctaband-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;}
.home-ctaband-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(24px,3vw,36px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin:0;}
.home-ctaband-title span{color:var(--blit);}
@media(max-width:640px){.home-ctaband-inner{flex-direction:column;align-items:flex-start;}}
`;

export default function HomeCTABand() {
  return (
    <>
      <style>{CSS}</style>
      <section className="home-ctaband" id="ritual-cta">
        <div className="home-ctaband-inner reveal">
          <h2 className="home-ctaband-title">Ten minutes a day.<br /><span>Everything changes.</span></h2>
          <a href="#kits" className="btn-primary" onClick={() => capture('ritual_cta_clicked')}>Start the ritual · from £65</a>
        </div>
      </section>
    </>
  );
}
