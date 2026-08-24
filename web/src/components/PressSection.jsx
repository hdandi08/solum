const PRESS = [
  {
    name: 'Luxury Lifestyle Magazine',
    quote: 'Pioneering a new era of men’s body care',
    url: 'https://www.luxurylifestylemag.co.uk/style-and-beauty/solum-pioneering-a-new-era-of-mens-body-care/',
    tier: 'lead',
  },
  {
    name: 'Carl Thompson',
    quote: 'rethinking body care',
    url: 'https://www.carlthompson.co.uk/further-reading-blogs/2026/8/24/solum-the-new-mens-grooming-brand-rethinking-body-care',
    tier: 'support',
  },
];

const CSS = `
.press-section{background:linear-gradient(180deg,var(--black),#090b0f);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:54px 24px 58px;}
.press-ledger{max-width:1180px;margin:0 auto;border-top:1px solid rgba(240,236,226,.16);border-bottom:1px solid rgba(240,236,226,.12);display:grid;grid-template-columns:1fr;gap:0;}
.press-intro{padding:24px 0 22px;border-bottom:1px solid var(--line);display:grid;gap:12px;}
.press-kicker{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:var(--blit);}
.press-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5.4vw,74px);line-height:.92;letter-spacing:.055em;color:var(--bone);margin:0;max-width:720px;}
.press-copy{max-width:520px;margin:0;color:rgba(240,236,226,.68);font-size:16px;font-weight:300;line-height:1.65;}
.press-feature{display:grid;grid-template-columns:1fr;gap:22px;padding:28px 0;color:inherit;text-decoration:none;}
.press-feature:focus-visible,.press-link:focus-visible{outline:2px solid var(--blit);outline-offset:4px;}
.press-logo-main{font-family:Georgia,serif;font-size:clamp(38px,7vw,86px);font-weight:700;letter-spacing:-.055em;line-height:.82;color:var(--bone);}
.press-logo-sub{display:block;margin-top:10px;font-size:10px;font-weight:700;letter-spacing:3.4px;text-transform:uppercase;color:rgba(240,236,226,.46);}
.press-quote-wrap{align-self:end;}
.press-quote{margin:0;font-family:'Bebas Neue',sans-serif;font-size:clamp(38px,6vw,78px);line-height:.92;letter-spacing:.04em;color:var(--bone);}
.press-read{display:inline-flex;margin-top:18px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--blit);}
.press-support{border-top:1px solid var(--line);padding:18px 0;display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;justify-content:space-between;color:rgba(240,236,226,.64);font-size:14px;font-weight:300;letter-spacing:.4px;}
.press-support-label{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,.45);}
.press-link{color:var(--bone);text-decoration:none;border-bottom:1px solid rgba(74,143,199,.45);padding-bottom:2px;}
.press-link:hover{border-color:var(--blit);}
@media(min-width:840px){
  .press-section{padding:70px 48px;}
  .press-intro{grid-template-columns:.95fr 1.05fr;align-items:end;padding:30px 0 26px;}
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
            <div>
              <div className="press-kicker">As featured in</div>
              <h2 className="press-head">Independent coverage for SOLUM.</h2>
            </div>
            <p className="press-copy">
              Early press places SOLUM inside the wider men’s body-care shift. Proof first, then the kit.
            </p>
          </div>
          <a className="press-feature" href={lead.url} target="_blank" rel="noreferrer">
            <div className="press-logo" aria-label={lead.name}>
              <div className="press-logo-main">Luxury<br />Lifestyle</div>
              <span className="press-logo-sub">Magazine</span>
            </div>
            <div className="press-quote-wrap">
              <blockquote className="press-quote">“{lead.quote}”</blockquote>
              <span className="press-read">Read the feature</span>
            </div>
          </a>
          <div className="press-support">
            <span className="press-support-label">Independent coverage</span>
            {support.map((item) => (
              <a key={item.name} className="press-link" href={item.url} target="_blank" rel="noreferrer">
                {item.name}: “{item.quote}”
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
