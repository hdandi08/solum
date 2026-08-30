import { capture } from '../lib/analytics.js';

const CSS = `
.problem-section{background:linear-gradient(180deg,var(--black),#0b0d11);border-top:1px solid var(--line);padding:88px 48px;}
.problem-inner{max-width:1200px;margin:0 auto;}
.problem-editorial{display:grid;grid-template-columns:minmax(0,.88fr) minmax(0,1.12fr);gap:58px;align-items:start;}
.problem-head{max-width:660px;margin-bottom:0;position:sticky;top:104px;}
.problem-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.problem-head h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(34px,4vw,60px);letter-spacing:.06em;color:var(--bone);line-height:1.04;margin-bottom:16px;}
.problem-head p{font-size:17px;font-weight:300;color:var(--mist);line-height:1.7;}
.problem-truth{border:1px solid rgba(240,236,226,.12);background:rgba(24,28,36,.42);padding:24px 26px;margin:0 0 18px;}
.problem-truth p{font-size:16px;font-weight:300;color:var(--mist);line-height:1.65;margin:0 0 10px;}
.problem-truth p:last-child{margin-bottom:0;}
.problem-truth strong{color:var(--bone);font-weight:600;}
.problem-method{display:grid;grid-template-columns:1fr 1fr;border:1px solid rgba(240,236,226,.12);margin-bottom:18px;}
.problem-method-panel{padding:18px 20px;border-left:1px solid rgba(240,236,226,.1);}
.problem-method-panel:first-child{border-left:none;}
.problem-method-label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);font-weight:700;margin-bottom:9px;}
.problem-method-copy{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.06em;color:var(--bone);line-height:.96;}
.problem-diagnosis{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:var(--line);}
.problem-diagnosis-item{background:rgba(24,28,36,.82);padding:22px 20px;min-height:126px;}
.problem-diagnosis-num{font-size:10px;letter-spacing:2.6px;text-transform:uppercase;color:rgba(74,143,199,.9);font-weight:700;margin-bottom:18px;}
.problem-diagnosis-item h3{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;color:var(--bone);line-height:1.2;margin-bottom:10px;}
.problem-diagnosis-item p{font-size:15px;font-weight:300;color:var(--mist);line-height:1.6;}
.problem-fix{background:rgba(18,35,58,.42);border:1px solid rgba(74,143,199,.42);padding:32px;margin-top:18px;}
.problem-fix p{font-size:17px;font-weight:300;color:var(--bone);line-height:1.7;}
.problem-fix strong{font-weight:600;}
.problem-cta-row{margin-top:20px;display:flex;}
@media(max-width:600px){.problem-cta-row .btn-primary{width:100%;text-align:center;}}
@media(max-width:600px){
  .problem-section{padding:58px 20px;}
  .problem-editorial{grid-template-columns:1fr;gap:28px;}
  .problem-head{position:static;}
  .problem-diagnosis,.problem-method{grid-template-columns:1fr;}
  .problem-method-panel{border-left:none;border-top:1px solid rgba(240,236,226,.1);}
  .problem-method-panel:first-child{border-top:none;}
  .problem-truth{padding:20px;margin-bottom:20px;}
  .problem-diagnosis-item{padding:20px;min-height:auto;}
  .problem-fix{padding:24px 20px;}
  .problem-fix p{font-size:15px;}
}
`;

const DIAGNOSIS = [
  ['Barrier-safe clean', 'Sensitive body wash cleans without leaving skin tight or stripped.'],
  ['Back and body scrubbed', 'The mitt and back cloth reach the areas hands miss.'],
  ['Intimate clean', 'A dedicated cloth gives sensitive zones a more deliberate clean.'],
  ['Scalp reset', 'The massager works buildup loose at the root.'],
  ['Clean that lasts', 'The full sequence cleans, scrubs, resets and finishes so your whole body feels properly clean for longer.'],
];

export default function ProblemSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="problem-section" id="problem" data-track="problem">
        <div className="problem-inner">
          <div className="problem-editorial">
            <div className="problem-head reveal">
              <div className="problem-tag">Why the old shower fails</div>
              <h2>Most men wash the easy parts and hope the rest is fine.</h2>
              <p>The problem is not effort. It is coverage, sequence and finish.</p>
            </div>
            <div>
              <div className="problem-truth reveal">
                <p><strong>One bottle. Hot water. Hands.</strong></p>
                <p>That leaves sensitive skin over-stripped, the back under-scrubbed, the scalp heavy and the finish missing.</p>
              </div>
              <div className="problem-method reveal">
                <div className="problem-method-panel">
                  <div className="problem-method-label">The old method</div>
                  <div className="problem-method-copy">Rinse and hope.</div>
                </div>
                <div className="problem-method-panel">
                  <div className="problem-method-label">The SOLUM method</div>
                  <div className="problem-method-copy">Cleanse. Scrub. Reset. Finish.</div>
                </div>
              </div>
              <div className="problem-diagnosis reveal">
                {DIAGNOSIS.map(([title, body], index) => (
                  <div key={title} className="problem-diagnosis-item">
                    <div className="problem-diagnosis-num">{String(index + 1).padStart(2, '0')}</div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                ))}
              </div>
              <div className="problem-fix reveal">
                <p>Body care has been treated like a product shelf. <strong>SOLUM gives you the pieces and the method: what to use, where to use it, and how to finish so clean lasts.</strong></p>
              </div>
              <div className="problem-cta-row reveal">
                <a href="#kits" className="btn-primary" onClick={() => capture('problem_cta_clicked')}>
                  Choose Your Kit
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
