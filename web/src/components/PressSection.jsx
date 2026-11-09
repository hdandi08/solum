import AwardProof from './AwardProof.jsx';

import { PRESS } from '../data/press.js';


const CSS = `
.press-section{background:linear-gradient(180deg,var(--black),#090b0f);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:54px 24px 58px;}
.press-ledger{max-width:1180px;margin:0 auto;border-top:1px solid rgba(240,236,226,.16);border-bottom:1px solid rgba(240,236,226,.12);display:grid;grid-template-columns:1fr;gap:0;}
.press-intro{padding:24px 0 22px;border-bottom:1px solid var(--line);display:grid;gap:12px;}
.press-kicker{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:var(--blit);}
.press-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5.4vw,74px);line-height:.92;letter-spacing:.055em;color:var(--bone);margin:0;max-width:720px;}
.press-copy{max-width:520px;margin:0;color:rgba(240,236,226,.68);font-size:16px;font-weight:300;line-height:1.65;}
.press-award{padding:20px 0;border-bottom:1px solid var(--line);}
.press-feature{display:grid;grid-template-columns:1fr;gap:22px;padding:28px 0;color:inherit;text-decoration:none;}
.press-feature:focus-visible,.press-link:focus-visible{outline:2px solid var(--blit);outline-offset:4px;}
.press-logo-main{font-family:Georgia,serif;font-size:clamp(38px,7vw,86px);font-weight:700;letter-spacing:-.055em;line-height:.82;color:var(--bone);}
.press-logo-sub{display:block;margin-top:10px;font-size:10px;font-weight:700;letter-spacing:3.4px;text-transform:uppercase;color:rgba(240,236,226,.46);}
.press-quote-wrap{align-self:end;}
.press-quote{margin:0;font-family:'Bebas Neue',sans-serif;font-size:clamp(38px,6vw,78px);line-height:.92;letter-spacing:.04em;color:var(--bone);}
.press-read{display:inline-flex;margin-top:18px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--blit);}
.press-support{border-top:1px solid var(--line);padding:18px 0;display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;justify-content:space-between;color:rgba(240,236,226,.64);font-size:14px;font-weight:300;letter-spacing:.4px;}
.press-support-label{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,.45);}
.press-link{display:inline-flex;align-items:center;gap:12px;color:var(--bone);text-decoration:none;border-bottom:1px solid rgba(74,143,199,.45);padding-bottom:2px;}
.press-link:hover{border-color:var(--blit);}
.press-lead-logo{display:block;width:160px;height:160px;object-fit:contain;}
.press-publication-logo{display:block;width:64px;height:64px;object-fit:contain;flex-shrink:0;}
@media(min-width:840px){
  .press-section{padding:70px 48px;}
  .press-intro{grid-template-columns:1fr;align-items:end;padding:30px 0 26px;}
  .press-copy{justify-self:end;}
  .press-feature{grid-template-columns:.78fr 1.22fr;gap:56px;padding:38px 0 42px;}
}
@media(max-width:620px){
  .press-section{padding:42px 20px 46px;}
  .press-head{font-size:38px;}
  .press-quote{font-size:42px;}
}
`;

export default function PressSection() {
  const lead = PRESS.find((item) => item.tier === 'lead');
  const support = PRESS.filter((item) => item.tier !== 'lead');

  return (
    <>
      <style>{CSS}</style>
      <section className="press-section" id="press" data-track="press">
        <div className="press-ledger reveal">
          <div className="press-intro">
            <h2 className="press-head">Awards and press.</h2>
          </div>
          <div className="press-award" aria-label="Esquire Grooming Awards 2026 winner">
            <AwardProof compact />
          </div>
          <a className="press-feature" href={lead.url} target="_blank" rel="noreferrer">
            <div className="press-logo" aria-label={lead.name}>
              {lead.logo ? <img className="press-lead-logo" src={lead.logo} alt={lead.name} width="160" height="160" /> : <div className="press-logo-main">{lead.name}</div>}
            </div>
            <div className="press-quote-wrap">
              <blockquote className="press-quote">“{lead.quote}”</blockquote>
              <span className="press-read">Read the feature</span>
            </div>
          </a>
          <div className="press-support">
            <span className="press-support-label">Also featured in</span>
            {support.map((item) => (
              <a key={item.name} className="press-link" href={item.url} target="_blank" rel="noreferrer">
                {item.logo && <img className="press-publication-logo" src={item.logo} alt={item.name} width="64" height="64" />}
                <span>{!item.logo && `${item.name}: `}“{item.quote}”</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
