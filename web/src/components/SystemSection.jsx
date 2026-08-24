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
.system-results{display:flex;flex-direction:column;gap:12px;margin-top:20px;padding-top:18px;border-top:1px solid rgba(240,236,226,0.14);}
.system-result-kicker{font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:4px;}
.system-result-copy{font-size:14px;color:var(--mist);font-weight:300;line-height:1.5;}
.ritual-ledger{margin-top:18px;border:1px solid rgba(240,236,226,.12);background:rgba(8,9,11,.42);}
.ritual-ledger-head{display:grid;grid-template-columns:1.1fr .95fr .95fr;border-bottom:1px solid rgba(240,236,226,.12);}
.ritual-ledger-title{padding:14px 16px;font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.07em;color:var(--bone);line-height:1;}
.ritual-ledger-col{padding:12px 14px;border-left:1px solid rgba(240,236,226,.12);}
.ritual-ledger-time{font-size:11px;letter-spacing:2.6px;text-transform:uppercase;color:var(--blit);font-weight:700;margin-bottom:5px;}
.ritual-ledger-note{font-size:13px;color:rgba(240,236,226,.66);font-weight:300;line-height:1.35;}
.ritual-ledger-row{display:grid;grid-template-columns:1.1fr .95fr .95fr;border-bottom:1px solid rgba(240,236,226,.08);}
.ritual-ledger-row:last-child{border-bottom:none;}
.ritual-ledger-zone{padding:14px 16px;font-size:10px;letter-spacing:2.3px;text-transform:uppercase;color:rgba(240,236,226,.52);font-weight:700;}
.ritual-ledger-cell{padding:14px;border-left:1px solid rgba(240,236,226,.08);font-size:14px;line-height:1.4;color:rgba(240,236,226,.78);font-weight:300;}
.ritual-ledger-foot{padding:13px 16px;border-top:1px solid rgba(74,143,199,.28);font-size:13px;color:var(--blit);letter-spacing:1.4px;text-transform:uppercase;font-weight:700;}
.system-arrow{display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--blit);flex-shrink:0;}
.system-cta{margin-top:32px;display:flex;justify-content:flex-start;}
@media(max-width:768px){
  .system-section{padding:60px 0;}
  .system-inner{padding:0 24px;}
  .system-grid{flex-direction:column;}
  .system-arrow{transform:rotate(90deg);padding:2px 0;}
  .ritual-ledger-head,.ritual-ledger-row{grid-template-columns:1fr;}
  .ritual-ledger-col,.ritual-ledger-cell{border-left:none;border-top:1px solid rgba(240,236,226,.08);}
  .system-cta{justify-content:center;}
}
`;

const OLD_WAY = [
  'Clean for an hour, then not quite',
  'Rough arms and thighs stay rough',
  'A back that is still missed',
  'A scalp that never feels reset',
  'Skin that feels tight by lunchtime',
];

const STEPS = [
  'Scalp reset first',
  'Wash without the stripped feeling',
  'Mitt clears roughness',
  'Back cloth reaches what hands miss',
  'Lotion locks in comfort',
];

const RESULTS = [
  {
    label: 'Daily outcome',
    copy: 'Freshness lasts longer, roughness comes down and the back is no longer missed.',
  },
  {
    label: 'Weekly reset',
    copy: 'Clay clears the surface, argan oil feeds the barrier, and the reset feels complete.',
  },
];

const LEDGER_ROWS = [
  {
    zone: 'Scalp',
    daily: '04 loosens buildup before the wash.',
    weekly: '04 gets more time, then argan oil finishes the reset.',
  },
  {
    zone: 'Back',
    daily: '03 reaches the zone hands keep missing.',
    weekly: '03 works after clay when skin is warm and ready.',
  },
  {
    zone: 'Body zones',
    daily: '01, 02 and 07 handle clean, texture and comfort.',
    weekly: '05 does the deeper reset before the oil finish.',
  },
  {
    zone: 'Skin finish',
    daily: '07 keeps the post-shower window from going to waste.',
    weekly: '06 feeds the finish so the ritual feels complete.',
  },
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
              <div className="system-results">
                {RESULTS.map((result) => (
                  <div key={result.label}>
                    <div className="system-result-kicker">{result.label}</div>
                    <div className="system-result-copy">{result.copy}</div>
                  </div>
                ))}
              </div>
              <div className="ritual-ledger">
                <div className="ritual-ledger-head">
                  <div className="ritual-ledger-title">The Ritual Ledger</div>
                  <div className="ritual-ledger-col">
                    <div className="ritual-ledger-time">10 min daily</div>
                    <div className="ritual-ledger-note">Maintenance for the shower you already take.</div>
                  </div>
                  <div className="ritual-ledger-col">
                    <div className="ritual-ledger-time">22 min weekly</div>
                    <div className="ritual-ledger-note">A deeper reset when skin needs more than maintenance.</div>
                  </div>
                </div>
                {LEDGER_ROWS.map((row) => (
                  <div className="ritual-ledger-row" key={row.zone}>
                    <div className="ritual-ledger-zone">{row.zone}</div>
                    <div className="ritual-ledger-cell">{row.daily}</div>
                    <div className="ritual-ledger-cell">{row.weekly}</div>
                  </div>
                ))}
                <div className="ritual-ledger-foot">Daily does the maintenance. Weekly does the reset.</div>
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
