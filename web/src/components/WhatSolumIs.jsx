// The homepage story explains the choices behind SOLUM; gifting supplies its own pillars.
const CSS = `
.wsi-section{background:var(--char);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:72px 24px;}
.wsi-inner{max-width:1200px;margin:0 auto;}
.wsi-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(30px,4vw,48px);letter-spacing:.05em;color:var(--bone);line-height:1;text-align:center;margin-bottom:36px;}
.wsi-grid{display:grid;grid-template-columns:1fr;gap:1px;background:var(--line);border:1px solid var(--line);}
.wsi-pillar{background:var(--char);padding:36px 30px;display:flex;flex-direction:column;gap:12px;}
.wsi-ic{width:48px;height:48px;display:block;margin-bottom:2px;}
.wsi-num{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.04em;color:var(--blit);line-height:1;}
.wsi-title{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:.03em;color:var(--bone);line-height:1.02;}
.wsi-body{font-size:15px;font-weight:300;color:var(--mist);line-height:1.6;}
.wsi-story{background:var(--black);scroll-margin-top:80px;padding:64px 24px;}
.wsi-story-header{display:grid;gap:20px;margin-bottom:32px;align-items:end;}
.wsi-story-label{font-size:14px;font-weight:600;color:var(--blit);margin:0 0 12px;}
.wsi-story .wsi-head{text-align:left;margin:0;max-width:580px;}
.wsi-story-intro{font-size:17px;font-weight:300;line-height:1.6;color:var(--mist);margin:0;max-width:460px;}
.wsi-layout{display:grid;gap:28px;}
.wsi-photo{margin:0;position:relative;overflow:hidden;background:var(--char);height:260px;}
.wsi-photo img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 34%;}
.wsi-photo figcaption{position:absolute;bottom:0;left:0;right:0;padding:36px 20px 18px;background:linear-gradient(transparent,rgba(8,9,11,.92));font-size:17px;font-weight:500;color:var(--bone);}
.wsi-story .wsi-grid{display:flex;flex-direction:column;justify-content:center;gap:0;background:none;border:0;}
.wsi-story .wsi-pillar{display:grid;grid-template-columns:64px minmax(0,1fr);column-gap:18px;row-gap:8px;background:none;padding:24px 0;border-bottom:1px solid var(--line);}
.wsi-story .wsi-pillar:first-child{padding-top:0;}
.wsi-story .wsi-pillar:last-child{border-bottom:0;padding-bottom:0;}
.wsi-story .wsi-ic{grid-column:1;grid-row:1 / 3;width:44px;height:44px;}
.wsi-story .wsi-title{grid-column:2;margin:0;font-size:25px;}
.wsi-story .wsi-body{grid-column:2;margin:0;}
.wsi-duration{grid-column:1;grid-row:1 / 3;display:flex;flex-direction:column;color:var(--blit);line-height:1;gap:5px;}
.wsi-duration strong{font-family:'Bebas Neue',sans-serif;font-size:42px;font-weight:400;}
.wsi-duration span{font-size:13px;font-weight:500;}
.wsi-weekly .wsi-duration{color:#c8a96e;}
.wsi-origin{display:flex;flex-direction:column;gap:16px;margin-top:28px;padding-top:24px;border-top:1px solid var(--line);}
.wsi-origin p{font-size:14px;line-height:1.5;font-weight:300;color:var(--stone);margin:0;max-width:480px;}
.wsi-origin a{font-size:15px;font-weight:600;color:var(--bone);text-decoration:underline;text-underline-offset:5px;align-self:flex-start;}
.wsi-origin a:focus-visible{outline:2px solid var(--blit);outline-offset:6px;}
@media(min-width:769px){
  .wsi-grid{grid-template-columns:repeat(3,1fr);}
  .wsi-story{padding:72px 48px;}
  .wsi-story-header{grid-template-columns:1.1fr 1fr;gap:48px;}
  .wsi-layout{grid-template-columns:.9fr 1.1fr;gap:48px;align-items:stretch;}
  .wsi-photo{height:auto;min-height:430px;}
  .wsi-photo img{position:absolute;inset:0;object-position:center 38%;}
  .wsi-story .wsi-pillar{grid-template-columns:76px minmax(0,1fr);column-gap:24px;padding:28px 0;}
  .wsi-origin{flex-direction:row;justify-content:space-between;align-items:center;}
}
`;

const PILLARS = [
  { n: '01', ic: '/icons/pillar-body.webp', title: 'Premium, with purpose.', body: 'Sulphate-free cleansing, nourishing hydration and purposeful tools. Our signature Cedarwood + Vetiver fragrance makes daily care something to look forward to.' },
  { n: '02', minutes: '10', cadence: 'daily', title: 'An upgrade that fits.', body: 'A routine for the shower you already take. Colour-coded, numbered products and a clear guide show you what to use, where and when, until the steps become habit.' },
  { n: '03', minutes: '22', cadence: 'weekly', title: 'Your weekly spa moment.', body: 'Earthy clay, warm water, slow exfoliation and an argan oil finish. A deeper reset at home that replaces your daily routine once a week.' },
];

export default function WhatSolumIs({ title = 'Built for men. From the ground up.', pillars = PILLARS } = {}) {
  const brandStory = pillars === PILLARS;
  return (
    <>
      <style>{CSS}</style>
      <section className={`wsi-section${brandStory ? ' wsi-story' : ''}`} id="what" aria-labelledby="why-solum-heading">
        <div className="wsi-inner">
          {brandStory ? (
            <header className="wsi-story-header reveal">
              <div>
                <p className="wsi-story-label">Why SOLUM</p>
                <h2 className="wsi-head" id="why-solum-heading">{title}</h2>
              </div>
              <p className="wsi-story-intro">The skin on your body is often an afterthought. And when you want to move beyond a 3-in-1, it can be hard to know where to start. We built SOLUM to make that next step feel straightforward and rewarding.</p>
            </header>
          ) : <h2 className="wsi-head reveal" id="why-solum-heading">{title}</h2>}
          <div className={brandStory ? 'wsi-layout reveal' : undefined}>
          {brandStory && (
            <figure className="wsi-photo">
              <img src="/products/feature/identity.webp" alt="A man using the SOLUM back scrub cloth across his chest" loading="lazy" width="1600" height="2400" />
              <figcaption>Body care, considered from the start.</figcaption>
            </figure>
          )}
          <div className="wsi-grid reveal">
            {pillars.map((p) => (
              <div className={`wsi-pillar${brandStory && p.cadence === 'weekly' ? ' wsi-weekly' : ''}`} key={p.n}>
                {p.ic && <img src={p.ic} className="wsi-ic" alt="" aria-hidden="true" loading="lazy" />}
                {brandStory && p.minutes ? <div className="wsi-duration"><strong>{p.minutes}</strong><span>min {p.cadence}</span></div> : !brandStory && <span className="wsi-num">{p.n}</span>}
                <h3 className="wsi-title">{p.title}</h3>
                <p className="wsi-body">{p.body}</p>
              </div>
            ))}
          </div>
          </div>
          {brandStory && (
            <div className="wsi-origin reveal">
              <p>SOLUM takes its name from the Latin for ground or foundation. Our approach starts with the whole routine.</p>
              <a href="#kits">Choose your kit</a>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
