// "What SOLUM is" acts as post-kit education, after proof, price and contents are already clear.
const CSS = `
.wsi-section{background:var(--char);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:80px 24px;}
.wsi-inner{max-width:1200px;margin:0 auto;}
.wsi-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(30px,4.5vw,52px);letter-spacing:.05em;color:var(--bone);line-height:1;text-align:center;margin-bottom:44px;}
.wsi-grid{display:grid;grid-template-columns:1fr;gap:1px;background:var(--line);border:1px solid var(--line);}
.wsi-pillar{background:var(--char);padding:36px 30px;display:flex;flex-direction:column;gap:12px;}
.wsi-ic{width:48px;height:48px;display:block;margin-bottom:2px;}
.wsi-num{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.04em;color:var(--blit);line-height:1;}
.wsi-title{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:.03em;color:var(--bone);line-height:1.02;}
.wsi-body{font-size:15px;font-weight:300;color:var(--mist);line-height:1.6;}
@media(min-width:769px){
  .wsi-grid{grid-template-columns:repeat(3,1fr);}
}
`;

const PILLARS = [
  { n: '01', ic: '/icons/pillar-body.webp', title: 'The body, finally.', body: 'Face and hair got routines decades ago. Your body, 90% of your skin, never did.' },
  { n: '02', ic: '/icons/pillar-guided.webp', title: 'Guided, not guessed.', body: 'A daily ritual to maintain and a weekly reset to go deeper. We tell you what to use, in what order, and how, for the best your skin can do.' },
  { n: '03', ic: '/icons/pillar-time.webp', title: 'Ten minutes.', body: 'The whole thing, compressed into the shower you already take. Better skin, no extra time.' },
];

export default function WhatSolumIs() {
  return (
    <>
      <style>{CSS}</style>
      <section className="wsi-section" id="what">
        <div className="wsi-inner">
          <h2 className="wsi-head reveal">The Body Ritual Men Were Missing</h2>
          <div className="wsi-grid reveal">
            {PILLARS.map((p) => (
              <div className="wsi-pillar" key={p.n}>
                <img src={p.ic} className="wsi-ic" alt="" aria-hidden="true" loading="lazy" />
                <span className="wsi-num">{p.n}</span>
                <h3 className="wsi-title">{p.title}</h3>
                <p className="wsi-body">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
