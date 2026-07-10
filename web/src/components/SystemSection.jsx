import { capture } from '../lib/analytics.js';

const CSS = `
.system-section{background:var(--black);padding:80px 0;border-top:1px solid var(--line);}
.system-inner{max-width:1100px;margin:0 auto;padding:0 48px;}
.system-kicker{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:14px;}
.system-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4.5vw,64px);letter-spacing:.05em;color:var(--bone);line-height:1.02;margin:0 0 36px;}
.system-title span{color:var(--blit);}
.system-grid{display:flex;align-items:stretch;gap:16px;}
.system-panel{flex:1;border-radius:10px;padding:24px;}
.system-panel-old{background:var(--char);border:1px dashed rgba(240,236,226,0.28);}
.system-panel-new{background:#12233a;border:1px solid var(--blue);}
.system-panel-label{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;margin-bottom:16px;}
.system-panel-old .system-panel-label{color:var(--stone);}
.system-panel-new .system-panel-label{color:var(--blit);}
.system-scraps{display:flex;flex-direction:column;gap:10px;}
.system-scrap{background:var(--black);border-radius:6px;padding:8px 12px;font-size:14px;color:var(--stone);font-weight:300;width:fit-content;}
.system-scrap:nth-child(1){transform:rotate(-1.5deg);}
.system-scrap:nth-child(2){transform:rotate(1deg);margin-left:10%;}
.system-scrap:nth-child(3){transform:rotate(-1deg);}
.system-scrap:nth-child(4){transform:rotate(1.5deg);margin-left:14%;}
.system-scrap:nth-child(5){transform:rotate(-0.5deg);}
.system-steps{display:flex;flex-direction:column;gap:13px;}
.system-step{display:flex;align-items:center;gap:12px;font-size:15px;color:var(--bone);}
.system-step-num{width:26px;height:26px;border-radius:50%;background:var(--blue);color:var(--bone);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.system-arrow{display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--blit);flex-shrink:0;}
.system-cta{margin-top:32px;display:flex;justify-content:flex-start;}
@media(max-width:768px){
  .system-section{padding:60px 0;}
  .system-inner{padding:0 24px;}
  .system-grid{flex-direction:column;}
  .system-arrow{transform:rotate(90deg);padding:2px 0;}
  .system-cta{justify-content:center;}
}
`;

const OLD_WAY = [
  'Hot water on the back',
  'Whatever wash was on offer',
  'A quick scrub with your hands',
  'Back never reached',
  'Scalp never once cleaned',
];

const STEPS = [
  'Scalp deep-cleaned · 2 min',
  'Wash that strips nothing',
  'Dead skin off, everywhere',
  'Back fully cleaned · 60 sec',
  'Locked in within 3 minutes',
];

export default function SystemSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="system-section" id="system">
        <div className="system-inner">
          <div className="system-kicker reveal">Why nothing changed until now</div>
          <h2 className="system-title reveal">Nobody ever gave you<br /><span>a system for your body.</span></h2>
          <div className="system-grid reveal">
            <div className="system-panel system-panel-old">
              <div className="system-panel-label">Every shower until today</div>
              <div className="system-scraps">
                {OLD_WAY.map((s) => <div key={s} className="system-scrap">{s}</div>)}
              </div>
            </div>
            <div className="system-arrow" aria-hidden="true">→</div>
            <div className="system-panel system-panel-new">
              <div className="system-panel-label">The SOLUM system · 10 minutes</div>
              <div className="system-steps">
                {STEPS.map((s, i) => (
                  <div key={s} className="system-step">
                    <span className="system-step-num">{i + 1}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="system-cta reveal">
            <a href="#kits" className="btn-primary" onClick={() => capture('system_cta_clicked')}>Get the system</a>
          </div>
        </div>
      </section>
    </>
  );
}
