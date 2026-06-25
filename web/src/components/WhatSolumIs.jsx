// "What SOLUM is" — short, scannable 3-pillar explainer between the hero and the ritual.
// Answers the hero's hook and plants the USP (body / guided / 10 min) before the deeper sections.
const CSS = `
.wsi-section{background:var(--char);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:80px 24px;}
.wsi-inner{max-width:1200px;margin:0 auto;}
.wsi-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(30px,4.5vw,52px);letter-spacing:.05em;color:var(--bone);line-height:1;text-align:center;margin-bottom:8px;}
.wsi-sub{font-size:14px;font-weight:300;color:var(--stone);text-align:center;max-width:520px;margin:0 auto 52px;line-height:1.6;}
.wsi-grid{display:grid;grid-template-columns:1fr;gap:1px;background:var(--line);border:1px solid var(--line);}
.wsi-pillar{background:var(--char);padding:36px 30px;display:flex;flex-direction:column;gap:12px;}
.wsi-num{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.04em;color:var(--blit);line-height:1;}
.wsi-title{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:.03em;color:var(--bone);line-height:1.02;}
.wsi-body{font-size:15px;font-weight:300;color:var(--mist);line-height:1.6;}
@media(min-width:769px){
  .wsi-grid{grid-template-columns:repeat(3,1fr);}
}
`;

const PILLARS = [
  { n: '01', title: 'The body, finally.', body: 'Face and hair got routines decades ago. Your body — 90% of your skin — never did.' },
  { n: '02', title: 'Guided, not guessed.', body: "We don't hand you bottles. We hand you the ritual: what, in what order, how." },
  { n: '03', title: 'Ten minutes.', body: 'The whole thing, compressed into the shower you already take. Better skin, no extra time.' },
];

export default function WhatSolumIs() {
  return (
    <>
      <style>{CSS}</style>
      <section className="wsi-section" id="what">
        <div className="wsi-inner">
          <h2 className="wsi-head reveal">Not products. A system.</h2>
          <p className="wsi-sub reveal">A shower wets the surface. SOLUM is the guided ritual that actually clears your skin — head to toe.</p>
          <div className="wsi-grid reveal">
            {PILLARS.map((p) => (
              <div className="wsi-pillar" key={p.n}>
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
