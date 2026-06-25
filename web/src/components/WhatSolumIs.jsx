// "What SOLUM is" — short, scannable 3-pillar explainer between the hero and the ritual.
// Answers the hero's hook and plants the USP (body / guided / 10 min) before the deeper sections.
const CSS = `
.wsi-section{background:var(--char);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:80px 24px;}
.wsi-inner{max-width:1200px;margin:0 auto;}
.wsi-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(30px,4.5vw,52px);letter-spacing:.05em;color:var(--bone);line-height:1;text-align:center;margin-bottom:8px;}
/* animated Body/Face swap — strikes "Face", lands on "Body" */
.wsi-swap{display:inline-grid;position:relative;}
.wsi-word-body,.wsi-word-face{grid-area:1/1;white-space:nowrap;}
.wsi-word-body{color:var(--bone);animation:wsiBody 5s ease-in-out 1.2s infinite both;}
.wsi-word-face{color:var(--stone);position:relative;animation:wsiFace 5s ease-in-out 1.2s infinite both;}
.wsi-strike{position:absolute;left:0;right:0;top:48%;height:3px;background:var(--blue);transform:scaleX(0);transform-origin:left;animation:wsiStrike 5s ease-in-out 1.2s infinite both;}
@keyframes wsiBody{0%,38%{opacity:1;transform:translateY(0);}46%,76%{opacity:0;transform:translateY(-8px);}84%,100%{opacity:1;transform:translateY(0);}}
@keyframes wsiFace{0%,38%{opacity:0;transform:translateY(8px);}46%,76%{opacity:1;transform:translateY(0);}84%,100%{opacity:0;transform:translateY(8px);}}
@keyframes wsiStrike{0%,44%{transform:scaleX(0);}56%,100%{transform:scaleX(1);}}
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
  { n: '01', title: 'The body, finally.', body: 'Face and hair got routines decades ago. Your body, 90% of your skin, never did.' },
  { n: '02', title: 'Guided, not guessed.', body: "We don't hand you bottles. We hand you the ritual: what, in what order, how." },
  { n: '03', title: 'Ten minutes.', body: 'The whole thing, compressed into the shower you already take. Better skin, no extra time.' },
];

export default function WhatSolumIs() {
  return (
    <>
      <style>{CSS}</style>
      <section className="wsi-section" id="what">
        <div className="wsi-inner">
          <h2 className="wsi-head reveal">
            The World's First Guided{' '}
            <span className="wsi-swap">
              <span className="wsi-word-body">Body</span>
              <span className="wsi-word-face">Face<span className="wsi-strike" /></span>
            </span>{' '}
            Ritual for Men
          </h2>
          <p className="wsi-sub reveal">A shower only wets the surface. SOLUM clears what it leaves behind. Head to toe, in the shower you already take.</p>
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
