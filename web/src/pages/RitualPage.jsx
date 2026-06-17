import Nav from '../components/Nav';
import SolumFooter from '../components/SolumFooter';
import RitualVideoSelector from '../components/ritual/RitualVideoSelector';
import RitualShopCTA from '../components/ritual/RitualShopCTA';

const CSS = `
.ritual-page{background:var(--black);min-height:100vh;padding-top:64px;}
/* tighten the selector's first-section spacing under the nav */
.ritual-page .rv-section{padding-top:52px;border-top:none;}

/* ── Two-tier system band ──────────────────────── */
.rp-system{background:var(--char);border-top:1px solid var(--line);padding:56px 24px;}
.rp-system-inner{max-width:900px;margin:0 auto;}
.rp-system-tag{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--stone);font-weight:600;text-align:center;margin-bottom:32px;}
.rp-system-grid{display:grid;grid-template-columns:1fr;gap:1px;background:var(--line);border:1px solid var(--line);}
.rp-tier{background:var(--char);padding:28px 26px;}
.rp-tier-label{display:inline-flex;align-items:center;gap:9px;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;margin-bottom:12px;}
.rp-tier-label .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.rp-tier.daily .rp-tier-label{color:var(--blit);}
.rp-tier.daily .dot{background:var(--blue);}
.rp-tier.weekly .rp-tier-label{color:#c8a96e;}
.rp-tier.weekly .dot{background:#c8a96e;}
.rp-tier-copy{font-size:15px;font-weight:300;color:var(--mist);line-height:1.6;}
@media(min-width:769px){
  .rp-system-grid{grid-template-columns:1fr 1fr;}
}
`;

export default function RitualPage() {
  return (
    <>
      <style>{CSS}</style>
      <Nav />
      <div className="ritual-page">
        <RitualVideoSelector
          eyebrow="The System"
          heading="The Ritual."
          sub="Daily keeps you maintained. Weekly resets you. Pick one to watch it run and see the products."
        />

        <div className="rp-system">
          <div className="rp-system-inner">
            <div className="rp-system-tag">The Two-Tier System</div>
            <div className="rp-system-grid">
              <div className="rp-tier daily">
                <div className="rp-tier-label"><span className="dot" />Daily · Every shower</div>
                <p className="rp-tier-copy">The maintenance pass. Ten minutes, head to toe, in the shower you already take.</p>
              </div>
              <div className="rp-tier weekly">
                <div className="rp-tier-label"><span className="dot" />Weekly · Once a week</div>
                <p className="rp-tier-copy">The deep reset. Clay draws out, exfoliation clears off, oil feeds back in.</p>
              </div>
            </div>
          </div>
        </div>

        <RitualShopCTA />
        <SolumFooter />
      </div>
    </>
  );
}
