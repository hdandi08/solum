import { useState } from 'react';
import AwardProof from './AwardProof.jsx';

import { PRESS } from '../data/press.js';


const CSS = `
.press-section{background:linear-gradient(180deg,var(--black),#090b0f);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:54px 24px 58px;}
.press-ledger{max-width:1180px;margin:0 auto;border-top:1px solid rgba(240,236,226,.16);border-bottom:1px solid rgba(240,236,226,.12);display:grid;grid-template-columns:1fr;gap:0;}
.press-intro{padding:24px 0 22px;border-bottom:1px solid var(--line);display:grid;gap:12px;}
.press-kicker{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:var(--blit);}
.press-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5.4vw,74px);line-height:.92;letter-spacing:.055em;color:var(--bone);margin:0;max-width:720px;}
.press-copy{max-width:520px;margin:0;color:rgba(240,236,226,.68);font-size:16px;font-weight:300;line-height:1.65;}
.press-award-feature{display:grid;gap:28px;padding:30px 0;border-bottom:1px solid var(--line);color:inherit;text-decoration:none;}
.press-esquire-logo{display:block;width:210px;max-width:100%;height:auto;filter:invert(1);}
.press-award-year{display:block;margin-top:14px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--mist);}
.press-award-detail{display:flex;align-items:center;gap:20px;min-width:0;}
.press-award-detail .award-proof-compact .award-proof-seal{width:88px;height:88px;}
.press-award-winner{display:block;margin-bottom:8px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--blit);}
.press-award-title{margin:0;font-family:'Bebas Neue',sans-serif;font-size:clamp(34px,5vw,60px);font-weight:400;letter-spacing:.035em;line-height:1;}
.press-feature{display:grid;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:24px;padding:28px 0;color:inherit;text-decoration:none;}
.press-award-feature:focus-visible,.press-feature:focus-visible,.press-link:focus-visible{outline:2px solid var(--blit);outline-offset:4px;}
.press-logo-main{font-family:Georgia,serif;font-size:clamp(38px,7vw,86px);font-weight:700;letter-spacing:-.055em;line-height:.82;color:var(--bone);}
.press-logo-sub{display:block;margin-top:10px;font-size:10px;font-weight:700;letter-spacing:3.4px;text-transform:uppercase;color:rgba(240,236,226,.46);}
.press-quote-wrap{align-self:end;}
.press-quote{margin:0;font-family:'Barlow Condensed',sans-serif;font-size:clamp(26px,3vw,36px);font-weight:600;line-height:1.1;color:var(--bone);}
.press-read{display:inline-flex;margin-top:18px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--blit);}
.press-support{border-top:1px solid var(--line);padding:22px 0 8px;min-width:0;}
.press-support-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px;}
.press-support-label{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,.45);}
.press-motion-toggle{font:inherit;font-size:12px;color:var(--mist);background:transparent;border:1px solid var(--line);padding:8px 12px;min-height:36px;cursor:pointer;}
.press-motion-toggle:focus-visible{outline:2px solid var(--blit);outline-offset:4px;}
.press-quote-rail{overflow:hidden;}
.press-quote-track{display:flex;width:max-content;}
.press-quote-group{display:flex;gap:28px;padding-right:28px;flex-shrink:0;}
.press-link{display:flex;flex-direction:column;align-items:flex-start;gap:12px;width:300px;max-width:calc(100vw - 64px);padding:0 22px 4px 0;border-right:1px solid var(--line);color:var(--bone);text-decoration:none;}
.press-quote-publication{font-size:12px;font-weight:600;letter-spacing:.5px;color:var(--blit);}
.press-quote-excerpt{font-size:24px;font-weight:300;line-height:1.25;}
.press-link:hover .press-quote-excerpt{color:#fff;}
@keyframes pressScroll{to{transform:translateX(-50%);}}
@media(prefers-reduced-motion:no-preference){
 .press-quote-track{animation:pressScroll 38s linear infinite;}
 .press-quote-rail:hover .press-quote-track,.press-quote-rail:focus-within .press-quote-track,.press-quote-track.is-paused{animation-play-state:paused;}
}
@media(prefers-reduced-motion:reduce){
 .press-motion-toggle,.press-quote-group[aria-hidden="true"]{display:none;}
 .press-quote-track{width:100%;}
 .press-quote-group{width:100%;flex-wrap:wrap;gap:24px;padding-right:0;}
 .press-link{width:300px;max-width:100%;}
}
.press-lead-logo{display:block;width:72px;height:72px;object-fit:contain;}
.press-publication-logo{display:block;width:64px;height:64px;object-fit:contain;flex-shrink:0;}
@media(min-width:840px){
  .press-section{padding:70px 48px;}
  .press-intro{grid-template-columns:1fr;align-items:end;padding:30px 0 26px;}
  .press-copy{justify-self:end;}
  .press-award-feature{grid-template-columns:.78fr 1.22fr;align-items:center;gap:56px;padding:40px 0;}
  .press-esquire-logo{width:280px;}
  .press-award-detail{gap:28px;}
  .press-award-detail .award-proof-compact .award-proof-seal{width:112px;height:112px;}
  .press-feature{grid-template-columns:.78fr 1.22fr;gap:56px;padding:30px 0;}
}
@media(max-width:620px){
  .press-section{padding:42px 20px 46px;}
  .press-head{font-size:38px;}
  .press-quote{font-size:28px;}
  .press-award-detail{gap:16px;}
  .press-award-detail .award-proof-compact .award-proof-seal{width:76px;height:76px;}
  .press-read{font-size:10px;letter-spacing:2px;margin-top:12px;}
}
`;

export default function PressSection({ showPublicationLogos = false } = {}) {
  const [quotesPaused, setQuotesPaused] = useState(false);
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
          <a className="press-award-feature" href="https://www.esquire.com/uk/style/grooming/g74246520/esquire-grooming-awards-2026/" target="_blank" rel="noreferrer">
            <div className="press-esquire-brand">
              <img className="press-esquire-logo" src="/press/esquire-logo.svg" alt="Esquire" width="783" height="116" loading="lazy" />
              <span className="press-award-year">Grooming Awards 2026</span>
            </div>
            <div className="press-award-detail">
              <AwardProof compact sealOnly />
              <div>
                <span className="press-award-winner">Winner · RITUAL</span>
                <h3 className="press-award-title">Best Grooming Kit</h3>
                <span className="press-read">See the award →</span>
              </div>
            </div>
          </a>
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
            <div className="press-support-header">
              <span className="press-support-label">Also featured in</span>
              <button type="button" className="press-motion-toggle" aria-label={quotesPaused ? 'Play press quotes' : 'Pause press quotes'} onClick={() => setQuotesPaused(!quotesPaused)}>{quotesPaused ? 'Play' : 'Pause'}</button>
            </div>
            <div className="press-quote-rail">
              <div className={`press-quote-track${quotesPaused ? ' is-paused' : ''}`}>
                {[false, true].map((duplicate) => (
                  <div key={String(duplicate)} className="press-quote-group" aria-hidden={duplicate || undefined} inert={duplicate || undefined}>
                    {support.map((item) => {
                      const Tag = duplicate ? 'div' : 'a';
                      return (
                        <Tag key={item.name} className="press-link" href={duplicate ? undefined : item.url} target={duplicate ? undefined : '_blank'} rel={duplicate ? undefined : 'noreferrer'}>
                          {(item.logo || (showPublicationLogos && item.checkoutLogo)) && <img className="press-publication-logo" src={item.logo ?? item.checkoutLogo} alt={duplicate ? '' : item.name} width="104" height="40" loading="lazy" />}
                          <span className="press-quote-publication">{item.name}</span>
                          <span className="press-quote-excerpt">“{item.quote}”</span>
                        </Tag>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
