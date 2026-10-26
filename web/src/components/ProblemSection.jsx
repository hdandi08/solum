const CSS = `
.problem-section{background:linear-gradient(180deg,var(--black),#0b0d11);border-top:1px solid var(--line);padding:clamp(56px,6vw,76px) 48px;}
.problem-inner{max-width:1200px;margin:0 auto;}
.problem-header{max-width:820px;}
.problem-kicker{margin:0 0 14px;color:var(--blit);font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;}
.problem-header h2{margin:0;font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,3.4vw,44px);font-weight:400;letter-spacing:.055em;line-height:.92;color:var(--bone);}
.problem-rule{width:56px;height:1px;margin:18px 0 0;background:linear-gradient(90deg,var(--blit),transparent);}
.problem-comparison{display:grid;grid-template-columns:1fr 1fr;gap:1px;margin-top:26px;border:1px solid rgba(240,236,226,.16);background:rgba(240,236,226,.16);}
.problem-panel{min-height:270px;padding:clamp(22px,2.4vw,32px);background:#0d1015;}
.problem-panel.solum{background:linear-gradient(140deg,rgba(26,74,120,.58),rgba(13,16,21,.96));}
.problem-panel-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.problem-label{display:block;color:var(--blit);font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;}
.problem-status{width:28px;height:28px;flex:0 0 28px;padding:5px;border:1px solid currentColor;}
.problem-status.old{color:#c85b5b;}
.problem-status.solum{color:var(--blit);}
.problem-old-words{margin:0;font-family:'Bebas Neue',sans-serif;font-size:clamp(38px,3.8vw,48px);font-weight:400;letter-spacing:.05em;line-height:.82;color:var(--bone);}
.problem-old-words span{color:rgba(240,236,226,.42);}
.problem-panel-copy{max-width:270px;margin:18px 0 0;color:var(--mist);font-size:16px;font-weight:300;line-height:1.42;}
.problem-plan{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;max-width:450px;}
.problem-plan-step{padding:11px 10px;border:1px solid rgba(74,143,199,.54);font-family:'Bebas Neue',sans-serif;font-size:clamp(22px,1.8vw,28px);font-weight:400;letter-spacing:.055em;line-height:.9;color:var(--bone);}
.problem-sequence-copy{margin:16px 0 0;font-size:14px;font-weight:500;letter-spacing:.07em;text-transform:uppercase;color:rgba(240,236,226,.54);}
.problem-outcome{max-width:300px;margin:16px 0 0;font-size:clamp(20px,1.7vw,25px);font-weight:300;line-height:1.1;color:var(--bone);}
@media(max-width:760px){
  .problem-section{padding:58px 20px;}
  .problem-comparison{grid-template-columns:1fr;margin-top:30px;}
  .problem-panel{min-height:0;padding:28px 24px;}
  .problem-panel-top{margin-bottom:22px;}
  .problem-old-words{font-size:44px;}
  .problem-panel-copy{margin-top:20px;font-size:16px;}
  .problem-plan-step{font-size:25px;padding:12px 10px;}
}
`;

export default function ProblemSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="problem-section" id="problem" data-track="problem">
        <div className="problem-inner">
          <div className="problem-header reveal">
            <div className="problem-kicker">The difference</div>
            <h2>The ten minutes you already spend in the shower.<br />A better system for your body.</h2>
            <div className="problem-rule" />
          </div>
          <div className="problem-comparison">
            <div className="problem-panel old reveal">
              <div className="problem-panel-top">
                <span className="problem-label">What most men do</span>
                <svg className="problem-status old" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <p className="problem-old-words">One bottle.<br /><span>Hands.</span><br /><span>Hot water.</span></p>
              <p className="problem-panel-copy">Cleans the easy parts. The rest is left to chance.</p>
            </div>
            <div className="problem-panel solum reveal">
              <div className="problem-panel-top">
                <span className="problem-label">The SOLUM plan</span>
                <svg className="problem-status solum" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className="problem-plan" aria-label="Cleanse. Reach. Reset. Finish.">
                <span className="problem-plan-step">Cleanse</span>
                <span className="problem-plan-step">Reach</span>
                <span className="problem-plan-step">Reset</span>
                <span className="problem-plan-step">Finish</span>
              </div>
              <p className="problem-sequence-copy">Cleanse. Reach. Reset. Finish.</p>
              <p className="problem-outcome">A guided, deeper clean that lasts.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
