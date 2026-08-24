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
.press-section{background:var(--black);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:34px 24px 42px;}
.press-inner{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1fr;gap:22px;}
.press-intro{display:flex;flex-direction:column;gap:10px;justify-content:center;}
.press-kicker{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:3.2px;text-transform:uppercase;color:var(--blit);}
.press-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(28px,4vw,46px);line-height:.96;letter-spacing:.055em;color:var(--bone);margin:0;}
.press-copy{max-width:440px;margin:0;color:var(--mist);font-size:15px;font-weight:300;line-height:1.55;}
.press-grid{display:grid;grid-template-columns:1fr;gap:1px;background:var(--line);border:1px solid var(--line);}
.press-card{background:linear-gradient(135deg,rgba(24,28,36,.98),rgba(8,9,11,.98));padding:24px 22px;min-height:178px;color:inherit;text-decoration:none;display:flex;flex-direction:column;justify-content:space-between;gap:24px;transition:transform .18s ease,border-color .18s ease,background .18s ease;}
.press-card:hover{transform:translateY(-2px);background:linear-gradient(135deg,rgba(31,38,50,.98),rgba(8,9,11,.98));}
.press-card:focus-visible{outline:2px solid var(--blit);outline-offset:3px;}
.press-card.lead{position:relative;overflow:hidden;}
.press-card.lead::after{content:'LLM';position:absolute;right:-10px;bottom:-28px;font-family:Georgia,serif;font-size:118px;font-weight:700;letter-spacing:-.1em;line-height:1;color:rgba(240,236,226,.045);pointer-events:none;}
.press-logo{position:relative;z-index:1;display:flex;flex-direction:column;gap:5px;align-items:flex-start;}
.press-logo-main{font-family:Georgia,serif;font-size:clamp(24px,4vw,38px);font-weight:700;letter-spacing:-.035em;line-height:.86;color:var(--bone);}
.press-logo-sub{font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(240,236,226,.55);}
.press-source{font-size:11px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;color:rgba(240,236,226,.58);}
.press-quote{position:relative;z-index:1;margin:0;font-family:'Bebas Neue',sans-serif;font-size:clamp(28px,4.2vw,44px);line-height:1;letter-spacing:.035em;color:var(--bone);}
.press-card.support .press-quote{font-size:clamp(26px,3.4vw,34px);}
.press-read{position:relative;z-index:1;font-size:11px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;color:var(--blit);}
@media(min-width:840px){
  .press-inner{grid-template-columns:.82fr 1.18fr;align-items:stretch;}
  .press-grid{grid-template-columns:1.18fr .82fr;}
  .press-section{padding:42px 48px;}
}
@media(max-width:620px){
  .press-section{padding:30px 18px 34px;}
  .press-card{min-height:154px;padding:22px 18px;}
  .press-card.lead::after{font-size:92px;right:-8px;bottom:-22px;}
}
`;

export default function PressSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="press-section" id="press" data-track="press">
        <div className="press-inner reveal">
          <div className="press-intro">
            <div className="press-kicker">Early press</div>
            <h2 className="press-head">The body-care conversation is moving.</h2>
            <p className="press-copy">
              SOLUM has landed its first two independent features, led by Luxury Lifestyle Magazine.
              A useful signal that the category is starting to open up.
            </p>
          </div>
          <div className="press-grid" aria-label="SOLUM press coverage">
            {PRESS.map((item) => (
              <a
                key={item.name}
                className={`press-card ${item.tier}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
              >
                <div className="press-logo">
                  {item.tier === 'lead' ? (
                    <>
                      <span className="press-logo-main">Luxury<br />Lifestyle</span>
                      <span className="press-logo-sub">Magazine</span>
                    </>
                  ) : (
                    <span className="press-source">{item.name}</span>
                  )}
                </div>
                <blockquote className="press-quote">“{item.quote}”</blockquote>
                <span className="press-read">Read the feature</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
